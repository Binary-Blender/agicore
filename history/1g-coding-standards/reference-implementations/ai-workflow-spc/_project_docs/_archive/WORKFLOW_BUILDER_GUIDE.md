# AI Workflow Builder Guide

## Overview

The AI Workflow Platform includes a visual drag-and-drop workflow builder that allows you to create, manage, and execute AI-powered workflows. This guide covers all features of the workflow builder including creating new workflows, editing existing ones, and understanding how workflows execute.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Creating a New Workflow](#creating-a-new-workflow)
3. [Available Modules](#available-modules)
4. [Connecting Modules](#connecting-modules)
5. [Configuring Modules](#configuring-modules)
6. [Saving and Managing Workflows](#saving-and-managing-workflows)
7. [Editing Existing Workflows](#editing-existing-workflows)
8. [Running Workflows](#running-workflows)
9. [QC (Quality Control) Process](#qc-quality-control-process)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

## Getting Started

### Accessing the Workflow Builder

1. Navigate to the platform at https://ai-workflow-spc.fly.dev/
2. Click on the "Workflow Builder" tab at the top of the page
3. You'll see three main sections:
   - **Module Palette** (left): Available modules to drag into your workflow
   - **Canvas** (center): Where you build your workflow
   - **Configuration Panel** (right): Settings for the selected module

### User Interface Overview

```
+----------------------------------------------------------+
|  AI Workflow Platform     [Workflows] [QC Queue] [Assets] |
+----------------------------------------------------------+
| Module Palette |  Canvas                | Configuration   |
|                |                        |                 |
| Generation     |  [Start] -> [Module]  | Selected Module |
|  - Image Gen   |     ↓                  | Settings...     |
|                |  [Module] -> [End]     |                 |
| Quality        |                        | [Save Changes]  |
|  - Pass/Fail   |                        |                 |
+----------------------------------------------------------+
```

## Creating a New Workflow

### Step 1: Start with a Clean Canvas
- Click "Clear Workflow" if there's an existing workflow on the canvas
- Enter a workflow name in the "Workflow Name" field
- Optionally add a description in the "Workflow Description" field

### Step 2: Add Modules
1. From the Module Palette, drag the "Start" module onto the canvas
2. Drag additional modules (e.g., "Image Generator") onto the canvas
3. Add a "Pass/Fail QC" module if you want human review
4. End with the "End" module

### Step 3: Connect Modules
1. Click on the output port (circle on the right) of a module
2. Drag to the input port (circle on the left) of the next module
3. Release to create a connection
4. For QC modules, you'll create two connections:
   - One for "pass" (continues to next module)
   - One for "fail" (typically loops back to retry)

### Step 4: Configure Each Module
1. Click on a module to select it
2. The Configuration Panel will show the module's settings
3. Fill in required fields (marked with asterisks)
4. For Image Generator, you must provide:
   - Prompt: The image description
   - API Key: Your AKOOL API key (BYOK - Bring Your Own Key)

### Step 5: Save Your Workflow
- Click the "Save Workflow" button
- Your workflow is now stored and ready to run

## Available Modules

### 1. Start Module
- **Purpose**: Entry point for every workflow
- **Configuration**:
  - Iterations: Number of times to run the workflow (default: 1)
- **Outputs**: Trigger signal to start the workflow

### 2. Image Generator Module
- **Purpose**: Generates AI images using AKOOL API
- **Configuration**:
  - Prompt* (required): Text description of the image to generate
  - Negative Prompt: What to avoid in the image
  - Number of Images: 1-4 images per execution
  - AKOOL API Key* (required): Your personal AKOOL API key
- **Outputs**: Array of generated image URLs

### 3. Pass/Fail QC Module
- **Purpose**: Pauses workflow for human quality review
- **Configuration**:
  - Review Mode: How to display images for review
- **Outputs**:
  - Pass: Approved images continue to next module
  - Fail: Rejected images can loop back or go to different module

### 4. End Module
- **Purpose**: Marks successful workflow completion
- **Configuration**: None
- **Outputs**: None

## Connecting Modules

### Basic Connections
- Every module (except End) must connect to at least one other module
- Connections flow from output ports (right side) to input ports (left side)
- Most modules have a single output that connects to the next module's input

### Conditional Connections (QC Module)
The Pass/Fail QC module has two outputs:
1. **Pass Output**: Connect to the next step in your workflow
2. **Fail Output**: Connect to where failed items should go (often back to regeneration)

Example QC routing:
```
Image Generator → QC Review → (Pass) → End
                      ↓
                    (Fail)
                      ↓
                 Image Generator (retry)
```

## Configuring Modules

### Required Fields
Fields marked with an asterisk (*) are required. The workflow cannot be saved without filling these in.

### API Keys (BYOK Approach)
- Each module instance can have its own API key
- This allows multiple users to use the platform without sharing credentials
- API keys are stored encrypted with the workflow configuration
- If you don't provide an API key, the system will attempt to use environment variables (if configured)

### Image Generator Specifics
- **Prompt**: Be descriptive for better results
  - Good: "A serene mountain landscape at sunset with snow-capped peaks and a clear lake"
  - Bad: "Mountain"
- **Number of Images**: AKOOL generates 1 image per API call, so selecting 4 will make 4 parallel calls
- **Aspect Ratio**: Currently fixed at 1:1 (square)

## Saving and Managing Workflows

### Save Options
- **New Workflow**: Click "Save Workflow" to create a new workflow
- **Update Workflow**: When editing, the button changes to "Update Workflow"
- **Cancel Edit**: Click "Cancel Edit" to discard changes and return to new workflow mode

### Workflow Management
From the Workflows tab, you can:
- **Run**: Execute the workflow
- **Edit**: Load the workflow back into the builder for modifications
- **Clone**: Create a copy of the workflow with a new ID
- **Delete**: Remove the workflow (only if no active executions)

## Editing Existing Workflows

### How to Edit a Workflow
1. Go to the "Workflows" tab
2. Find the workflow you want to edit
3. Click the "Edit" button
4. The workflow will load in the builder with all modules and connections
5. Make your changes:
   - Add/remove modules
   - Update configurations
   - Change connections
6. Click "Update Workflow" to save changes

### What Happens to Running Workflows
- Editing a workflow doesn't affect currently running executions
- Changes only apply to new executions started after saving

### Edit Mode Indicators
- The builder shows "Editing: [Workflow Name]" at the top
- The save button changes to "Update Workflow"
- A "Cancel Edit" button appears

## Running Workflows

### Starting a Workflow
1. Go to the "Workflows" tab
2. Click "Run" on the workflow you want to execute
3. Set the number of iterations (if applicable)
4. Click "Run Workflow"

### Monitoring Execution
- The execution status shows in real-time
- States include: pending, running, paused_for_qc, completed, failed
- For workflows with QC, check the "QC Queue" tab when status is "paused_for_qc"

### Workflow Execution Flow
1. **Start**: Workflow begins execution
2. **Module Processing**: Each module executes in sequence
3. **QC Pause** (if applicable): Workflow pauses for human review
4. **QC Decision**: Human approves/rejects items
5. **Routing**: Based on QC decision, items follow pass/fail paths
6. **Completion**: Workflow reaches End module

## QC (Quality Control) Process

### For QC Reviewers
1. Go to the "QC Queue" tab
2. You'll see pending tasks with images to review
3. For each image:
   - Click "Approve" (green checkmark) to pass
   - Click "Reject" (red X) to fail
4. Selected images show colored borders:
   - Green border = marked for approval
   - Red border = marked for rejection
5. Click "Submit All Decisions" when done

### QC Best Practices
- Review all images before submitting
- You can change decisions by clicking approve/reject again
- The submit button shows progress (e.g., "Submit All Decisions (3/4)")
- Submit is only enabled when all images have decisions

### After QC Submission
- Approved images continue to the next workflow step
- Rejected images follow the fail connection path
- The workflow automatically resumes after submission

## Best Practices

### 1. Workflow Design
- Keep workflows simple and linear when possible
- Use descriptive names for workflows and modules
- Add workflow descriptions to document the purpose
- Test with one iteration before running large batches

### 2. API Key Management
- Store API keys securely
- Use unique API keys per workflow when possible
- Never share API keys between users
- Rotate keys periodically for security

### 3. Error Handling
- Always connect both outputs from QC modules
- Design fail paths that make sense (retry vs. skip)
- Monitor failed executions in the logs

### 4. Performance
- Limit parallel operations to avoid API rate limits
- Use appropriate number of images (1-4) based on needs
- Consider QC reviewer workload when designing workflows

## Troubleshooting

### Common Issues and Solutions

#### "API Key Not Configured" Error
- **Cause**: No API key provided in module configuration
- **Solution**: Edit the workflow and add your AKOOL API key to the Image Generator module

#### Workflow Stuck in "paused_for_qc"
- **Cause**: QC items waiting for review
- **Solution**: Go to QC Queue and review pending items

#### Cannot Delete Workflow
- **Cause**: Workflow has active executions
- **Solution**: Wait for executions to complete or fail before deleting

#### Images Not Appearing in QC Queue
- **Cause**: Workflow skipping QC module
- **Solution**: Check module connections and ensure QC module is properly connected

#### Module Configuration Not Saving
- **Cause**: Required fields not filled
- **Solution**: Ensure all fields marked with (*) are completed

### Getting Help

If you encounter issues not covered here:
1. Check the lessons_learned.md file for documented solutions
2. Review the API logs for error messages
3. Verify your API keys are correct and have sufficient credits
4. Ensure all module connections are properly configured

## Advanced Features (Coming Soon)

The following features are planned for future releases:

- **MCP Integration**: Connect to Model Context Protocol servers
- **Custom Modules**: Create your own workflow modules
- **Parallel Execution**: Run multiple branches simultaneously
- **Variables**: Pass data between modules dynamically
- **Scheduling**: Run workflows on a schedule
- **Webhooks**: Trigger workflows from external events
- **Templates**: Pre-built workflow templates
- **Version Control**: Track workflow changes over time

## Summary

The AI Workflow Builder provides a visual, intuitive way to create complex AI workflows without coding. By combining different modules and configuring their connections, you can build sophisticated automation that includes human quality control, automatic retries, and conditional logic. The BYOK approach ensures secure API key management, while the drag-and-drop interface makes workflow creation accessible to non-technical users.

Remember to start simple, test thoroughly, and gradually add complexity as you become familiar with the platform.