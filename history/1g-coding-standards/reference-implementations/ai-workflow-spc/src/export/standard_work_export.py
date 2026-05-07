"""
Standard Work Export - Generate PDF and Excel exports of Standard Work sheets
Sprint 6.1 - Priority 1: Export Functionality
"""
from typing import Dict, Any, List
from datetime import datetime
from io import BytesIO
import logging

# PDF generation
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas as pdf_canvas

# Excel generation
import xlsxwriter
import pandas as pd

# QR code generation
import qrcode
from PIL import Image

logger = logging.getLogger(__name__)

# Binary Blender orange color
BB_ORANGE = '#ff6b35'
BB_ORANGE_RGB = (255, 107, 53)
BB_RED = '#CC0000'
ANDON_YELLOW = '#FFD700'
KAIZEN_GREEN = '#008000'


def generate_qr_code(url: str, size: int = 200) -> Image:
    """Generate QR code for given URL"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    # Resize to specified size
    img = img.resize((size, size))
    return img


def generate_standard_work_pdf(
    workflow_id: str,
    workflow_name: str,
    standard_work_steps: List[Dict[str, Any]],
    tps_metrics: Dict[str, Any]
) -> bytes:
    """
    Generate PDF export of Standard Work sheet

    Uses landscape orientation for wide tables
    Includes QR code linking to live view
    Uses Binary Blender orange theme
    """
    try:
        buffer = BytesIO()

        # Use landscape letter size
        doc = SimpleDocTemplate(
            buffer,
            pagesize=landscape(letter),
            rightMargin=0.5*inch,
            leftMargin=0.5*inch,
            topMargin=0.75*inch,
            bottomMargin=0.5*inch
        )

        # Container for PDF elements
        elements = []

        # Styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor(BB_ORANGE),
            spaceAfter=12,
            alignment=TA_CENTER
        )

        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor(BB_ORANGE),
            spaceAfter=8
        )

        # Title
        elements.append(Paragraph(f"Standard Work Sheet: {workflow_name}", title_style))
        elements.append(Spacer(1, 0.2*inch))

        # Workflow metadata
        metadata_text = f"""
        <b>Workflow ID:</b> {workflow_id}<br/>
        <b>Generated:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}<br/>
        <b>Total Steps:</b> {len(standard_work_steps)}
        """
        elements.append(Paragraph(metadata_text, styles['Normal']))
        elements.append(Spacer(1, 0.3*inch))

        # TPS Metrics Summary
        elements.append(Paragraph("TPS Metrics Overview", heading_style))

        if tps_metrics and tps_metrics.get('executions_count', 0) > 0:
            metrics_data = [
                ['Metric', 'Value', 'Status'],
                [
                    'Cycle Time (avg)',
                    f"{tps_metrics['cycle_time']['average']:.2f}s",
                    get_status_indicator(tps_metrics['cycle_time']['average'], 120, lower_is_better=True)
                ],
                [
                    'First Pass Yield',
                    f"{tps_metrics['first_pass_yield']['percentage']:.1f}%",
                    get_status_indicator(tps_metrics['first_pass_yield']['percentage'], 85)
                ],
                [
                    'Defect Rate',
                    f"{tps_metrics['defect_rate']['percentage']:.1f}%",
                    get_status_indicator(tps_metrics['defect_rate']['percentage'], 10, lower_is_better=True)
                ],
                [
                    'OEE',
                    f"{tps_metrics['oee']['overall']:.1f}%",
                    get_status_indicator(tps_metrics['oee']['overall'], 75)
                ],
                [
                    'Throughput',
                    f"{tps_metrics['throughput']['per_day']:.2f}/day",
                    'N/A'
                ]
            ]
        else:
            metrics_data = [
                ['Metric', 'Value', 'Status'],
                ['No execution data', 'Run workflow to generate metrics', 'N/A']
            ]

        metrics_table = Table(metrics_data, colWidths=[3*inch, 2*inch, 1.5*inch])
        metrics_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(BB_ORANGE)),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey)
        ]))

        elements.append(metrics_table)
        elements.append(Spacer(1, 0.3*inch))

        # Standard Work Table
        elements.append(Paragraph("Standard Work Steps", heading_style))

        # Prepare table data
        table_data = [[
            'Step',
            'Work Element',
            'Manual\nTime (s)',
            'Auto\nTime (s)',
            'Total\nTime (s)',
            'Type',
            'Human\nRequired',
            'Key Points'
        ]]

        for i, step in enumerate(standard_work_steps, 1):
            manual_time = step.get('manual_time', 0) or 0
            auto_time = step.get('auto_time', 0) or 0
            total_time = manual_time + auto_time

            # Truncate key points if too long
            key_points = step.get('key_points', [])
            key_points_str = '; '.join(key_points[:2]) if key_points else 'N/A'
            if len(key_points_str) > 50:
                key_points_str = key_points_str[:47] + '...'

            table_data.append([
                str(i),
                step.get('description', 'N/A'),
                f"{manual_time:.1f}",
                f"{auto_time:.1f}",
                f"{total_time:.1f}",
                step.get('work_element_type', 'standard'),
                'Yes' if step.get('requires_human', False) else 'No',
                key_points_str
            ])

        # Create table with appropriate column widths
        col_widths = [0.5*inch, 2*inch, 0.8*inch, 0.8*inch, 0.8*inch, 1*inch, 0.8*inch, 2.5*inch]
        work_table = Table(table_data, colWidths=col_widths)

        # Style the table
        table_style = [
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(BB_ORANGE)),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'TOP')
        ]

        # Color-code rows based on type and human required
        for i, step in enumerate(standard_work_steps, 1):
            row_idx = i  # +1 for header, but 0-indexed so cancels out

            # Highlight critical steps
            if step.get('work_element_type') == 'critical':
                table_style.append(('BACKGROUND', (0, row_idx), (-1, row_idx), colors.HexColor(ANDON_YELLOW)))

            # Highlight human-required steps
            if step.get('requires_human', False):
                table_style.append(('TEXTCOLOR', (6, row_idx), (6, row_idx), colors.HexColor(BB_RED)))
                table_style.append(('FONTNAME', (6, row_idx), (6, row_idx), 'Helvetica-Bold'))

        work_table.setStyle(TableStyle(table_style))
        elements.append(work_table)

        # Footer with QR code reference
        elements.append(Spacer(1, 0.3*inch))
        footer_text = f"""
        <b>Live View:</b> Scan QR code or visit:<br/>
        https://ai-workflow-spc.fly.dev/tps-builder.html?workflow_id={workflow_id}
        """
        elements.append(Paragraph(footer_text, styles['Normal']))

        # Build PDF
        doc.build(elements)

        pdf_bytes = buffer.getvalue()
        buffer.close()

        logger.info(f"Generated PDF for workflow {workflow_id} ({len(pdf_bytes)} bytes)")
        return pdf_bytes

    except Exception as e:
        logger.error(f"Error generating PDF: {e}", exc_info=True)
        raise


def generate_standard_work_excel(
    workflow_id: str,
    workflow_name: str,
    standard_work_steps: List[Dict[str, Any]],
    tps_metrics: Dict[str, Any]
) -> bytes:
    """
    Generate Excel export of Standard Work sheet

    Creates multi-sheet workbook:
    - Sheet 1: Standard Work table
    - Sheet 2: TPS Metrics dashboard
    - Sheet 3: Time Analysis breakdown
    """
    try:
        buffer = BytesIO()

        # Create workbook
        workbook = xlsxwriter.Workbook(buffer, {'in_memory': True})

        # Define formats
        header_format = workbook.add_format({
            'bold': True,
            'bg_color': BB_ORANGE,
            'font_color': 'white',
            'align': 'center',
            'valign': 'vcenter',
            'border': 1
        })

        cell_format = workbook.add_format({
            'align': 'center',
            'valign': 'vcenter',
            'border': 1
        })

        text_format = workbook.add_format({
            'align': 'left',
            'valign': 'vcenter',
            'border': 1,
            'text_wrap': True
        })

        critical_format = workbook.add_format({
            'align': 'center',
            'valign': 'vcenter',
            'border': 1,
            'bg_color': ANDON_YELLOW
        })

        human_format = workbook.add_format({
            'align': 'center',
            'valign': 'vcenter',
            'border': 1,
            'font_color': BB_RED,
            'bold': True
        })

        number_format = workbook.add_format({
            'align': 'center',
            'valign': 'vcenter',
            'border': 1,
            'num_format': '0.0'
        })

        # Sheet 1: Standard Work
        ws1 = workbook.add_worksheet('Standard Work')

        # Title
        ws1.merge_range('A1:H1', f'Standard Work: {workflow_name}', header_format)
        ws1.set_row(0, 30)

        # Metadata
        ws1.write('A2', 'Workflow ID:', header_format)
        ws1.write('B2', workflow_id, cell_format)
        ws1.write('D2', 'Generated:', header_format)
        ws1.write('E2', datetime.now().strftime('%Y-%m-%d %H:%M:%S'), cell_format)

        # Headers
        headers = ['Step', 'Work Element', 'Manual Time (s)', 'Auto Time (s)',
                   'Total Time (s)', 'Type', 'Human Required', 'Key Points']
        for col, header in enumerate(headers):
            ws1.write(3, col, header, header_format)

        # Set column widths
        ws1.set_column('A:A', 8)   # Step
        ws1.set_column('B:B', 30)  # Work Element
        ws1.set_column('C:E', 15)  # Times
        ws1.set_column('F:F', 12)  # Type
        ws1.set_column('G:G', 15)  # Human Required
        ws1.set_column('H:H', 40)  # Key Points

        # Data rows
        row = 4
        for i, step in enumerate(standard_work_steps, 1):
            manual_time = step.get('manual_time', 0) or 0
            auto_time = step.get('auto_time', 0) or 0
            total_time = manual_time + auto_time

            key_points = step.get('key_points', [])
            key_points_str = '; '.join(key_points) if key_points else 'N/A'

            # Determine format based on step properties
            is_critical = step.get('work_element_type') == 'critical'
            requires_human = step.get('requires_human', False)

            row_format = critical_format if is_critical else cell_format
            human_cell_format = human_format if requires_human else cell_format

            ws1.write(row, 0, i, row_format)
            ws1.write(row, 1, step.get('description', 'N/A'), text_format)
            ws1.write(row, 2, manual_time, number_format)
            ws1.write(row, 3, auto_time, number_format)
            ws1.write(row, 4, total_time, number_format)
            ws1.write(row, 5, step.get('work_element_type', 'standard'), row_format)
            ws1.write(row, 6, 'Yes' if requires_human else 'No', human_cell_format)
            ws1.write(row, 7, key_points_str, text_format)

            ws1.set_row(row, 30)  # Row height for text wrapping
            row += 1

        # Totals row
        ws1.write(row, 0, 'TOTAL', header_format)
        ws1.write(row, 1, '', header_format)
        ws1.write_formula(row, 2, f'=SUM(C5:C{row})', header_format)
        ws1.write_formula(row, 3, f'=SUM(D5:D{row})', header_format)
        ws1.write_formula(row, 4, f'=SUM(E5:E{row})', header_format)
        ws1.write(row, 5, '', header_format)
        ws1.write(row, 6, '', header_format)
        ws1.write(row, 7, '', header_format)

        # Sheet 2: TPS Metrics
        ws2 = workbook.add_worksheet('TPS Metrics')

        ws2.merge_range('A1:D1', 'TPS Metrics Dashboard', header_format)
        ws2.set_row(0, 30)

        ws2.write('A2', 'Period:', header_format)
        ws2.write('B2', f"{tps_metrics.get('period_days', 7)} days", cell_format)
        ws2.write('C2', 'Executions:', header_format)
        ws2.write('D2', tps_metrics.get('executions_count', 0), cell_format)

        # Metrics table
        ws2.write('A4', 'Metric', header_format)
        ws2.write('B4', 'Current Value', header_format)
        ws2.write('C4', 'Target', header_format)
        ws2.write('D4', 'Status', header_format)

        ws2.set_column('A:A', 20)
        ws2.set_column('B:B', 15)
        ws2.set_column('C:C', 12)
        ws2.set_column('D:D', 12)

        # Good/Warning/Bad formats
        good_format = workbook.add_format({
            'align': 'center',
            'border': 1,
            'bg_color': KAIZEN_GREEN,
            'font_color': 'white',
            'bold': True
        })

        warning_format = workbook.add_format({
            'align': 'center',
            'border': 1,
            'bg_color': ANDON_YELLOW,
            'bold': True
        })

        bad_format = workbook.add_format({
            'align': 'center',
            'border': 1,
            'bg_color': BB_RED,
            'font_color': 'white',
            'bold': True
        })

        metrics_row = 5
        if tps_metrics and tps_metrics.get('executions_count', 0) > 0:
            # Cycle Time
            ws2.write(metrics_row, 0, 'Cycle Time (avg)', cell_format)
            ct_avg = tps_metrics['cycle_time']['average']
            ws2.write(metrics_row, 1, f"{ct_avg:.2f}s", number_format)
            ws2.write(metrics_row, 2, '< 120s', cell_format)
            status_fmt = good_format if ct_avg < 120 else bad_format
            ws2.write(metrics_row, 3, '✓' if ct_avg < 120 else '✗', status_fmt)
            metrics_row += 1

            # First Pass Yield
            ws2.write(metrics_row, 0, 'First Pass Yield', cell_format)
            fpy = tps_metrics['first_pass_yield']['percentage']
            ws2.write(metrics_row, 1, f"{fpy:.1f}%", number_format)
            ws2.write(metrics_row, 2, '> 85%', cell_format)
            status_fmt = good_format if fpy > 85 else bad_format
            ws2.write(metrics_row, 3, '✓' if fpy > 85 else '✗', status_fmt)
            metrics_row += 1

            # Defect Rate
            ws2.write(metrics_row, 0, 'Defect Rate', cell_format)
            dr = tps_metrics['defect_rate']['percentage']
            ws2.write(metrics_row, 1, f"{dr:.1f}%", number_format)
            ws2.write(metrics_row, 2, '< 10%', cell_format)
            status_fmt = good_format if dr < 10 else bad_format
            ws2.write(metrics_row, 3, '✓' if dr < 10 else '✗', status_fmt)
            metrics_row += 1

            # OEE
            ws2.write(metrics_row, 0, 'Overall Equipment Effectiveness', cell_format)
            oee = tps_metrics['oee']['overall']
            ws2.write(metrics_row, 1, f"{oee:.1f}%", number_format)
            ws2.write(metrics_row, 2, '> 75%', cell_format)
            status_fmt = good_format if oee > 75 else (warning_format if oee > 50 else bad_format)
            ws2.write(metrics_row, 3, '✓' if oee > 75 else '~' if oee > 50 else '✗', status_fmt)
            metrics_row += 1

            # Throughput
            ws2.write(metrics_row, 0, 'Throughput', cell_format)
            tp = tps_metrics['throughput']['per_day']
            ws2.write(metrics_row, 1, f"{tp:.2f}/day", number_format)
            ws2.write(metrics_row, 2, 'N/A', cell_format)
            ws2.write(metrics_row, 3, '-', cell_format)
        else:
            ws2.merge_range(f'A{metrics_row}:D{metrics_row}',
                           'No execution data - Run workflow to generate metrics',
                           cell_format)

        # Sheet 3: Time Analysis
        ws3 = workbook.add_worksheet('Time Analysis')

        ws3.merge_range('A1:D1', 'Time Analysis Breakdown', header_format)
        ws3.set_row(0, 30)

        # Calculate time breakdown
        total_manual = sum(step.get('manual_time', 0) or 0 for step in standard_work_steps)
        total_auto = sum(step.get('auto_time', 0) or 0 for step in standard_work_steps)
        total_time = total_manual + total_auto

        # Summary
        ws3.write('A3', 'Time Type', header_format)
        ws3.write('B3', 'Total (s)', header_format)
        ws3.write('C3', 'Percentage', header_format)
        ws3.write('D3', 'Count', header_format)

        ws3.write('A4', 'Manual Time', cell_format)
        ws3.write('B4', total_manual, number_format)
        ws3.write('C4', f"{(total_manual/total_time*100 if total_time > 0 else 0):.1f}%", cell_format)
        ws3.write('D4', sum(1 for s in standard_work_steps if (s.get('manual_time') or 0) > 0), cell_format)

        ws3.write('A5', 'Auto Time', cell_format)
        ws3.write('B5', total_auto, number_format)
        ws3.write('C5', f"{(total_auto/total_time*100 if total_time > 0 else 0):.1f}%", cell_format)
        ws3.write('D5', sum(1 for s in standard_work_steps if (s.get('auto_time') or 0) > 0), cell_format)

        ws3.write('A6', 'Total Time', header_format)
        ws3.write('B6', total_time, header_format)
        ws3.write('C6', '100%', header_format)
        ws3.write('D6', len(standard_work_steps), header_format)

        # Breakdown by work element type
        ws3.write('A8', 'By Work Element Type', header_format)
        ws3.write('B8', 'Count', header_format)
        ws3.write('C8', 'Total Time (s)', header_format)
        ws3.write('D8', 'Avg Time (s)', header_format)

        # Count by type
        type_counts = {}
        type_times = {}
        for step in standard_work_steps:
            wetype = step.get('work_element_type', 'standard')
            type_counts[wetype] = type_counts.get(wetype, 0) + 1
            step_time = (step.get('manual_time') or 0) + (step.get('auto_time') or 0)
            type_times[wetype] = type_times.get(wetype, 0) + step_time

        row = 9
        for wetype in sorted(type_counts.keys()):
            ws3.write(row, 0, wetype, cell_format)
            ws3.write(row, 1, type_counts[wetype], cell_format)
            ws3.write(row, 2, type_times[wetype], number_format)
            ws3.write(row, 3, type_times[wetype] / type_counts[wetype], number_format)
            row += 1

        ws3.set_column('A:A', 20)
        ws3.set_column('B:D', 15)

        # Close workbook and get bytes
        workbook.close()

        excel_bytes = buffer.getvalue()
        buffer.close()

        logger.info(f"Generated Excel for workflow {workflow_id} ({len(excel_bytes)} bytes)")
        return excel_bytes

    except Exception as e:
        logger.error(f"Error generating Excel: {e}", exc_info=True)
        raise


def get_status_indicator(value: float, threshold: float, lower_is_better: bool = False) -> str:
    """Get status indicator for a metric"""
    if lower_is_better:
        return '✓ Good' if value < threshold else '✗ Poor'
    else:
        return '✓ Good' if value > threshold else '✗ Poor'
