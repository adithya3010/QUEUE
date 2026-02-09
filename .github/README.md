# GitHub Actions CI/CD Workflows

This directory contains automated workflows for continuous integration, continuous deployment, and code quality checks.

## 📋 Workflows

### 1. CI Pipeline (`ci.yml`)
**Triggers:** Push to main/develop, Pull Requests

**Jobs:**
- **Backend Tests**: Runs Jest tests with coverage on Node 18.x and 20.x
- **Frontend Tests**: Runs Vitest tests with coverage on Node 18.x and 20.x
- **Lint**: Runs ESLint on frontend code
- **Build**: Builds the frontend application
- **Security Audit**: Checks for vulnerable dependencies

**Badge:**
```markdown
![CI](https://github.com/YOUR_USERNAME/Smart-Queue/workflows/CI%2FCD%20Pipeline/badge.svg)
```

---

### 2. Deployment Pipeline (`deploy.yml`)
**Triggers:** Push to main branch, Manual trigger

**Jobs:**
- **Test Before Deploy**: Runs all tests before deployment
- **Deploy Frontend**: Deploys to Vercel
- **Deploy Backend**: Triggers Render deployment
- **Notification**: Reports deployment status

---

### 3. PR Checks (`pr-checks.yml`)
**Triggers:** Pull Request events

**Jobs:**
- **PR Info**: Lists changed files
- **Backend Quality**: Runs backend tests and posts coverage
- **Frontend Quality**: Runs frontend tests and linting
- **Size Check**: Reports bundle size

---

## 🔐 Required Secrets

Set these in **Settings → Secrets and variables → Actions**:

### For Deployment (`deploy.yml`):

| Secret Name | Description | How to Get |
|------------|-------------|-----------|
| `VERCEL_TOKEN` | Vercel deployment token | [Vercel Account Settings](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Your Vercel organization ID | Run `vercel whoami` in terminal |
| `VERCEL_PROJECT_ID` | Your Vercel project ID | Found in `.vercel/project.json` |
| `RENDER_DEPLOY_HOOK` | Render deployment webhook URL | Render Dashboard → Settings → Deploy Hook |
| `JWT_SECRET` | JWT secret for production | Generate with `openssl rand -base64 32` |

### For Coverage Reporting (Optional):

| Secret Name | Description |
|------------|-------------|
| `CODECOV_TOKEN` | Token from codecov.io for coverage reports |

---

## 🚀 Setup Instructions

### 1. Enable GitHub Actions
Actions should be enabled by default. Check in **Settings → Actions → General**.

### 2. Configure Vercel Deployment

```bash
# In frontend/vite-project directory
npm i -g vercel
vercel login
vercel link
```

This creates `.vercel/project.json` with your project IDs.

### 3. Configure Render Deployment

1. Go to your Render dashboard
2. Select your backend service
3. Navigate to **Settings**
4. Scroll to **Deploy Hook**
5. Click **Create Deploy Hook**
6. Copy the URL and add as `RENDER_DEPLOY_HOOK` secret

### 4. Add Secrets to GitHub

```bash
# Navigate to your GitHub repository
# Go to Settings → Secrets and variables → Actions
# Click "New repository secret"
# Add each secret from the table above
```

---

## 📊 Workflow Status

### How to View:
- **Actions Tab**: See all workflow runs
- **Commit Status**: Green checkmark or red X on commits
- **PR Comments**: Automatic coverage reports on pull requests

### Local Testing:

Test workflows locally before pushing:

```bash
# Install act (GitHub Actions local runner)
# https://github.com/nektos/act

# Run CI workflow locally
act push

# Run specific job
act -j backend-tests
```

---

## 🔄 Workflow Behavior

### On Push to Main:
1. Runs all tests
2. Deploys to production (if tests pass)
3. Notifies about deployment status

### On Pull Request:
1. Runs all tests
2. Posts coverage report as PR comment
3. Checks code quality
4. Reports bundle size

### On Push to Develop:
1. Runs all tests
2. Does NOT deploy

---

## 📝 Badge Examples

Add these to your main README.md:

```markdown
![CI Status](https://github.com/YOUR_USERNAME/Smart-Queue/workflows/CI%2FCD%20Pipeline/badge.svg)
![Tests](https://img.shields.io/badge/tests-passing-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)
```

---

## 🛠 Customization

### Modify Node Versions

In `ci.yml`, update the matrix:

```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x, 22.x]  # Add more versions
```

### Change Test Commands

Update the test steps:

```yaml
- name: Run backend tests
  working-directory: ./backend
  run: npm test -- --verbose  # Add flags
```

### Add Environment Variables

```yaml
env:
  NODE_ENV: test
  DATABASE_URL: ${{ secrets.TEST_DB_URL }}
```

---

## 📚 Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel Deployment](https://vercel.com/docs/cli)
- [Render Deploy Hooks](https://render.com/docs/deploy-hooks)
- [Codecov Integration](https://about.codecov.io/language/javascript/)

---

## ⚠️ Troubleshooting

### Tests Failing in CI but Passing Locally

**Solution**: Check environment variables and Node versions

```yaml
# Add debug step
- name: Debug Environment
  run: |
    echo "Node version: $(node -v)"
    echo "NPM version: $(npm -v)"
    printenv
```

### Deployment Not Triggering

**Solution**: Verify secrets are set correctly

```bash
# Check if secret is set (in GitHub Actions)
- name: Check Secrets
  run: |
    if [ -z "${{ secrets.VERCEL_TOKEN }}" ]; then
      echo "VERCEL_TOKEN not set"
      exit 1
    fi
```

### High Resource Usage

**Solution**: Use caching to speed up builds

```yaml
- uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

---

## 🎯 Best Practices

1. **Always test before deploying** ✅
2. **Use matrix builds** for multiple Node versions ✅
3. **Cache dependencies** to speed up workflows ✅
4. **Fail fast** to save CI minutes ✅
5. **Use secrets** for sensitive data ✅
6. **Add status badges** to README ✅
7. **Monitor workflow runs** regularly ✅

---

Last Updated: 2026-02-08
