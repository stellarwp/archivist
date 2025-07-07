# Using Archivist as a GitHub Action

Archivist can be used as a GitHub Action to archive web content in your CI/CD pipelines. This is useful for:

- Documenting API changes over time
- Creating snapshots of documentation sites
- Building LLM training datasets
- Archiving competitor or reference sites

## Quick Start

```yaml
name: Archive Documentation
on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday
  workflow_dispatch:

jobs:
  archive:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Archive websites
        uses: stellarwp/archivist@action
        with:
          config-file: './archivist.config.json'
          pure-api-key: ${{ secrets.PURE_API_KEY }}
      
      - name: Upload archives
        uses: actions/upload-artifact@v4
        with:
          name: web-archives
          path: |
            archive/
            *-archive/
```

## Configuration

### Action Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `config-file` | Path to configuration file (JSON format) | No | `archivist.config.json` |
| `pure-api-key` | Pure.md API key for enhanced extraction | No | - |

### Action Outputs

| Output | Description |
|--------|-------------|
| `total-files` | Number of files successfully archived |
| `total-errors` | Number of errors encountered |

## Configuration File Format

For GitHub Actions, use JSON format instead of TypeScript:

```json
{
  "archives": [
    {
      "name": "My Documentation",
      "sources": ["https://docs.example.com"],
      "output": {
        "directory": "./docs-archive",
        "format": "markdown",
        "fileNaming": "url-based"
      }
    }
  ],
  "crawl": {
    "maxConcurrency": 3,
    "delay": 1000,
    "userAgent": "Archivist/1.0",
    "timeout": 30000
  }
}
```

### Converting TypeScript Config to JSON

If you have an existing `archivist.config.ts`, convert it to JSON:

```bash
# Install Archivist locally
npm install @stellarwp/archivist

# Create JSON config manually or with a script
node -e "console.log(JSON.stringify(require('./archivist.config.ts').default, null, 2))" > archivist.config.json
```

## Examples

### Archive Multiple Sites

```json
{
  "archives": [
    {
      "name": "React Docs",
      "sources": [{
        "url": "https://react.dev/reference/react",
        "depth": 2,
        "includePatterns": ["https://react\\.dev/reference/.*"]
      }],
      "output": {
        "directory": "./react-docs",
        "format": "markdown"
      }
    },
    {
      "name": "MDN JavaScript",
      "sources": ["https://developer.mozilla.org/en-US/docs/Web/JavaScript"],
      "output": {
        "directory": "./mdn-js",
        "format": "json"
      }
    }
  ],
  "crawl": {
    "maxConcurrency": 2,
    "delay": 2000
  }
}
```

### With Error Handling

```yaml
- name: Archive websites
  id: archive
  uses: stellarwp/archivist@action
  with:
    config-file: './archivist.config.json'
  continue-on-error: true

- name: Check results
  run: |
    echo "Files archived: ${{ steps.archive.outputs.total-files }}"
    echo "Errors: ${{ steps.archive.outputs.total-errors }}"
    
    if [ "${{ steps.archive.outputs.total-errors }}" -gt "0" ]; then
      echo "::warning::Archive completed with errors"
    fi
```

### Scheduled Archives

```yaml
name: Weekly Documentation Archive
on:
  schedule:
    - cron: '0 2 * * 1'  # Every Monday at 2 AM
  workflow_dispatch:
    inputs:
      sites:
        description: 'Additional sites to archive'
        required: false

jobs:
  archive:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Archive documentation sites
        uses: stellarwp/archivist@action
        with:
          config-file: './weekly-archive.json'
          pure-api-key: ${{ secrets.PURE_API_KEY }}
      
      - name: Commit archives
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add -A
          git commit -m "Archive: $(date +'%Y-%m-%d')" || echo "No changes"
          git push
```

## Advanced Usage

### Matrix Strategy for Multiple Configs

```yaml
strategy:
  matrix:
    config:
      - react-docs.json
      - vue-docs.json
      - angular-docs.json

steps:
  - uses: stellarwp/archivist@action
    with:
      config-file: ./configs/${{ matrix.config }}
```

### Conditional Archiving

```yaml
- name: Check if archive needed
  id: check
  run: |
    # Check if files changed
    if git diff --name-only HEAD~1 | grep -q "docs/"; then
      echo "archive_needed=true" >> $GITHUB_OUTPUT
    fi

- name: Archive if needed
  if: steps.check.outputs.archive_needed == 'true'
  uses: stellarwp/archivist@action
  with:
    config-file: './archivist.config.json'
```

## Differences from CLI

1. **Configuration Format**: GitHub Action uses JSON instead of TypeScript
2. **Logging**: Structured output with GitHub Actions annotations
3. **No Installation**: Runs from pre-bundled JavaScript file
4. **Environment**: Runs on Ubuntu runners with Node.js 20

## Troubleshooting

### Common Issues

1. **"Config file should be JSON"**: Convert your `.ts` config to `.json`
2. **"No Pure.md API key"**: Add key to repository secrets
3. **Large archives**: Use `actions/upload-artifact` with compression
4. **Rate limiting**: Increase `delay` in crawl config

### Debug Mode

Enable debug logs:

```yaml
- name: Archive with debug
  uses: stellarwp/archivist@action
  env:
    ACTIONS_STEP_DEBUG: true
  with:
    config-file: './archivist.config.json'
```

## Best Practices

1. **Store API keys securely**: Use GitHub Secrets
2. **Limit concurrency**: Use appropriate `maxConcurrency` for target sites
3. **Add delays**: Respect rate limits with `delay` setting
4. **Archive incrementally**: Use scheduled workflows for large sites
5. **Monitor errors**: Check `total-errors` output

## Migration from CLI

To migrate from CLI to GitHub Action:

1. Convert config file to JSON
2. Update workflow to use action instead of CLI
3. Remove `npm install` step
4. Use action inputs/outputs instead of CLI arguments

Before:
```yaml
- run: npm install @stellarwp/archivist
- run: npx archivist crawl
```

After:
```yaml
- uses: stellarwp/archivist@action
  with:
    config-file: './archivist.config.json'
```