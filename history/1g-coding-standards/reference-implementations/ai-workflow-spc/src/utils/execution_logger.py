"""
Execution Logger - Captures logs for display in execution logs UI
"""
import logging
from typing import Dict, Any, List
from datetime import datetime


class ExecutionLogCapture(logging.Handler):
    """
    Custom logging handler that captures logs to execution context
    for display in the execution logs UI
    """

    def __init__(self, execution_context: Dict[str, Any]):
        super().__init__()
        self.execution_context = execution_context
        if "execution_logs" not in self.execution_context:
            self.execution_context["execution_logs"] = []

    def emit(self, record: logging.LogRecord):
        """Capture log record to execution context"""
        try:
            # Only capture INFO and above
            if record.levelno < logging.INFO:
                return

            # Format the message
            message = self.format(record)

            # Create log entry
            log_entry = {
                "timestamp": datetime.fromtimestamp(record.created).isoformat(),
                "level": record.levelname,
                "message": message,
                "logger_name": record.name,
                "module": record.module,
                "function": record.funcName,
                "line": record.lineno
            }

            # Add exception info if present
            if record.exc_info:
                import traceback
                log_entry["traceback"] = "".join(traceback.format_exception(*record.exc_info))

            # Store in execution context
            self.execution_context["execution_logs"].append(log_entry)

        except Exception:
            # Don't let logging failures break execution
            pass


def attach_execution_logger(execution_context: Dict[str, Any], logger_names: List[str] = None):
    """
    Attach execution log capture handler to specified loggers

    Args:
        execution_context: The execution context to store logs in
        logger_names: List of logger names to capture. If None, captures root logger.
    """
    handler = ExecutionLogCapture(execution_context)
    formatter = logging.Formatter('%(message)s')
    handler.setFormatter(formatter)

    if logger_names is None:
        logger_names = ['']  # Root logger

    for logger_name in logger_names:
        logger = logging.getLogger(logger_name)
        logger.addHandler(handler)

    return handler


def detach_execution_logger(handler: ExecutionLogCapture, logger_names: List[str] = None):
    """
    Remove execution log capture handler from loggers

    Args:
        handler: The handler to remove
        logger_names: List of logger names to detach from. If None, detaches from root logger.
    """
    if logger_names is None:
        logger_names = ['']  # Root logger

    for logger_name in logger_names:
        logger = logging.getLogger(logger_name)
        logger.removeHandler(handler)
