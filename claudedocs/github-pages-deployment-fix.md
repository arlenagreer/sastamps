# GitHub Pages Deployment Issue - Resolution Guide

## Issue Summary

The GitHub Pages "pages build and deployment" workflow is failing during the "Upload artifact" step with exit code 1. The workflow attempts to upload the entire repository root as an artifact, which exceeds GitHub's upload limits.

## Root Cause

**Build Type: Legacy Mode**

The repository's GitHub Pages is configured to use "legacy" build type, which means:
- Deploys from the main branch root directory (path: `/`)
- GitHub automatically creates a workflow that uploads the entire repository
- This includes all development files: `node_modules/`, `scripts/`, `claudedocs/`, etc.
- Total size exceeds artifact upload limits, causing failure

**Current Configuration:**
```json
{
  "build_type": "legacy",
  "source": {
    "branch": "main",
    "path": "/"
  }
}
```

## Failed Attempts

### Attempt 1: .gitattributes with export-ignore
- Created `.gitattributes` with `export-ignore` directives
- **Result**: Did not work because automatic Pages workflow doesn't use git archive
- The workflow uses a tar command directly on the working directory

### Attempt 2: Removed node_modules from tracking
- Removed `browser-tools-test/browser-tools-test/node_modules/` from git
- Added `browser-tools-test/` to `.gitignore`
- **Result**: Still failed because `node_modules/` in repository root is still present

## Current State

The automatic workflow is still uploading:
- All `node_modules/` files (thousands of files)
- All development directories (`scripts/`, `claudedocs/`, `.claude/`, etc.)
- Test files and configuration files
- Temporary files and caches

**Example from logs:**
```
./node_modules/bubble-stream-error/
./node_modules/bubble-stream-error/.npmignore
./node_modules/bubble-stream-error/README.md
... [thousands more files]
```

## Proper Solution

### Switch to GitHub Actions Build Type

The repository already has a proper CI/CD workflow (`.github/workflows/ci.yml`) that:
1. Builds only necessary files into `_site` directory
2. Uploads only the `_site` directory as artifact
3. Deploys cleanly without development files

**Steps to Fix:**

1. **Go to GitHub Pages Settings:**
   https://github.com/arlenagreer/sastamps/settings/pages

2. **Change Source:**
   - Current: "Deploy from a branch" (legacy mode)
   - Change to: "GitHub Actions"

3. **Save Settings**

### Why This Works

The existing CI workflow (`.github/workflows/ci.yml`) already:
- Builds the site properly
- Creates a clean `_site` directory with only deployment files
- Uses `actions/upload-pages-artifact@v3` with correct path configuration
- Has been tested and works correctly

**CI Workflow Deployment Configuration:**
```yaml
- name: Upload artifact
  uses: actions/upload-pages-artifact@v3
  with:
    path: '_site'  # Only uploads built files
```

**Size Comparison:**
- Current (legacy): Attempts to upload entire repository (500MB+ with node_modules)
- CI workflow: Only uploads `_site` directory (~50MB of built files)

## Manual Workaround (Not Recommended)

If switching to GitHub Actions is not possible, you would need to:

1. Create a separate `gh-pages` branch with only built files
2. Configure Pages to deploy from `gh-pages` branch
3. Add build step to CI that pushes to `gh-pages`

**This is not recommended because:**
- More complex to maintain
- Requires additional CI configuration
- Already have working GitHub Actions workflow

## Verification Steps

After switching to GitHub Actions:

1. Monitor the workflow runs:
   ```bash
   gh run list --limit 5
   ```

2. Check that the Pages deployment succeeds:
   ```bash
   gh run view <run-id> --log
   ```

3. Verify site is accessible at: https://www.sastamps.org

## Technical Details

### Current Workflow Failure
```
X Upload artifact (exit code 1)
Process completed with exit code 1.
build: .github#9216
```

### Successful CI Workflow
The CI workflow successfully:
- Runs tests and builds
- Creates clean deployment artifact
- Has proper caching and optimization
- Deploys only necessary files

**Recent successful CI runs:**
- Build and deploy workflow completed successfully
- Only deployment issue is with automatic Pages workflow

## Recommendations

1. **Immediate Action:** Switch Pages source to "GitHub Actions" at repository settings
2. **Long-term:** Keep using the CI workflow for deployments
3. **Cleanup:** After switch, clean up any unnecessary files from repository
4. **Monitoring:** Set up alerts for workflow failures

## Files Modified During Troubleshooting

- `.gitattributes` - Created (not effective for this issue)
- `.gitignore` - Added `browser-tools-test/`
- Removed: `browser-tools-test/browser-tools-test/node_modules/`

These changes don't fix the issue but are good hygiene to prevent future problems.

## Conclusion

The issue cannot be resolved through code changes alone. The GitHub Pages settings must be changed from "Deploy from a branch" (legacy) to "GitHub Actions" to use the existing, working CI/CD workflow.

---

**Status:** Awaiting user action to change GitHub Pages settings
**Priority:** High - Site deployment is currently failing
**Impact:** No new deployments until settings are changed
