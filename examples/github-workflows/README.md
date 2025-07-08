# GitHub Workflow Examples

This directory contains example GitHub Actions workflows that demonstrate how to use Archivist in your own projects.

## Available Examples

### archive.yml
A basic workflow that runs Archivist to archive your documentation on a schedule or manual trigger. This example shows:
- How to set up Archivist in a GitHub Action
- Using cron schedules for automatic archiving
- Manual workflow dispatch
- Committing archived content back to the repository

### example-archivist.yml
A more comprehensive example that demonstrates:
- Using the Archivist GitHub Action with various configuration options
- Setting up Pure.md API key from secrets
- Custom configuration file usage
- Advanced archiving scenarios

## Usage

To use these workflows in your own project:

1. Copy the desired workflow file to your repository's `.github/workflows/` directory
2. Modify the configuration to match your needs
3. Add any required secrets (like `PURE_API_KEY`) to your repository settings
4. Customize the archivist.config.ts file in your repository root

## Note

These workflows are examples and should be adapted to your specific use case. The Archivist repository itself uses different workflows for testing and building the action.