# GitHub Actions Setup Guide

This document provides step-by-step instructions for setting up GitHub Actions CI/CD for your Smart Queue project.

## 📋 Prerequisites

- GitHub repository for Smart Queue
- Vercel account (for frontend deployment)
- Render account (for backend deployment)
- Admin access to your GitHub repository

---

## 🚀 Quick Start

### 1. Enable GitHub Actions

GitHub Actions should be enabled by default. To verify:

1. Go to your repository on GitHub
2. Click on **Settings**
3. Navigate to **Actions** → **General**
4. Ensure "Allow all actions and reusable workflows" is selected

### 2. Push Workflow Files

The workflow files in `.github/workflows/` should automatically be recognized once pushed to your repository:

```bash
git add .github/
git commit -m "Add CI/CD workflows"
git push origin main
```

---

## 🔐 Required Secrets Configuration

### Navigate to Secrets Settings

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** for each secret below

### Secrets to Add

#### For CI/CD (Optional but Recommended)

| Secret Name | Required | Description |
|------------|----------|-------------|
| `JWT_SECRET` | Optional | JWT secret for tests (auto-generated if not provided) |
| `CODECOV_TOKEN` | Optional | Token from codecov.io for coverage reports |

#### For Automated Deployment (Required for auto-deploy)

| Secret Name | Required | Description | Example |
|------------|----------|-------------|---------|
| `VERCEL_TOKEN` | Yes | Your Vercel API token | `ABC123...` |
| `VERCEL_ORG_ID` | Yes | Your Vercel organization ID | `team_abc123` |
| `VERCEL_PROJECT_ID` | Yes | Your Vercel project ID | `prj_abc123` |
| `RENDER_DEPLOY_HOOK` | Yes | Render deployment webhook URL | `https://api.render.com/deploy/...` |

---

## 📝 Detailed Setup Instructions

### Getting Vercel Credentials

#### 1. Install Vercel CLI

```bash
npm install -g vercel
```

#### 2. Login to Vercel

```bash
vercel login
```

#### 3. Link Your Project

```bash
cd frontend/vite-project
vercel link
```

This creates `.vercel/project.json` with your IDs.

#### 4. Get Vercel Token

1. Go to [Vercel Account Settings → Tokens](https://vercel.com/account/tokens)
2. Click **Create Token**
3. Name it "GitHub Actions"
4. Set scope to your account/team
5. Copy the token (shown once!)
6. Add to GitHub as `VERCEL_TOKEN`

#### 5. Get Organization and Project IDs

```bash
# From your frontend directory
cat .vercel/project.json
```

Copy `orgId` → Add as `VERCEL_ORG_ID`
Copy `projectId` → Add as `VERCEL_PROJECT_ID`

---

### Getting Render Deploy Hook

#### 1. Access Your Render Dashboard

Go to [https://dashboard.render.com](https://dashboard.render.com)

#### 2. Select Your Backend Service

Click on your Smart Queue backend service

#### 3. Create Deploy Hook

1. Navigate to **Settings**
2. Scroll to **Deploy Hook** section
3. Click **Create Deploy Hook**
4. Name it "GitHub Actions"
5. Copy the generated URL
6. Add to GitHub as `RENDER_DEPLOY_HOOK`

---

### Getting JWT Secret (Optional)

If you want to use a specific JWT secret for CI tests:

```bash
# Generate a secure random key
openssl rand -base64 32
```

Add the output as `JWT_SECRET` in GitHub secrets.

**Note:** If not provided, workflows will use a test-specific secret automatically.

---

## ✅ Verification

### Test CI Pipeline

1. Make a small change to your code
2. Commit and push to a feature branch
3. Create a Pull Request
4. Watch the Actions tab for workflow runs

Expected results:
- ✅ Backend tests pass
- ✅ Frontend tests pass
- ✅ Lint checks pass
- ✅ Build succeeds
- ✅ Security audit completes

### Test Deployment Pipeline

1. Merge PR to `main` branch
2. Watch the Actions tab
3. Verify deployment to Vercel and Render

Expected results:
- ✅ Tests pass
- ✅ Frontend deploys to Vercel
- ✅ Backend deploys to Render
- ✅ Deployment notification posted

---

## 🔧 Troubleshooting

### Tests Failing in CI

**Issue:** Tests pass locally but fail in CI

**Solution:**
```yaml
# Add debug step to workflow
- name: Debug Environment
  run: |
    echo "Node: $(node -v)"
    echo "NPM: $(npm -v)"
    printenv | grep -v SECRET
```

### Deployment Not Triggering

**Issue:** Push to main doesn't trigger deployment

**Checklist:**
- [ ] All secrets are correctly set
- [ ] Workflow file is on `main` branch
- [ ] GitHub Actions is enabled
- [ ] Branch protection rules don't block workflows

### Coverage Upload Fails

**Issue:** Code coverage not uploading to Codecov

**Solution:**
- Create account at [codecov.io](https://codecov.io)
- Add repository
- Copy token
- Add as `CODECOV_TOKEN` secret

### Vercel Deployment Fails

**Issue:** "Project not found" or authentication errors

**Solution:**
```bash
# Re-link project
cd frontend/vite-project
rm -rf .vercel
vercel link

# Get new IDs
cat .vercel/project.json

# Update GitHub secrets with new IDs
```

---

## 📊 Monitoring Workflows

### View Workflow Runs

1. Go to **Actions** tab in your repository
2. See all workflow runs (green = success, red = failure)
3. Click on a run to see detailed logs

### Workflow Badges

Add to your README.md:

```markdown
![CI](https://github.com/YOUR_USERNAME/Smart-Queue/workflows/CI%2FCD%20Pipeline/badge.svg)
```

Replace `YOUR_USERNAME` with your GitHub username.

---

## 🎯 Best Practices

### Do's ✅

- Always run tests before deploying
- Use matrix builds for multiple Node versions
- Cache dependencies to speed up builds
- Monitor workflow execution times
- Review security audit results
- Keep secrets secure and rotated

### Don'ts ❌

- Don't commit secrets to repository
- Don't skip tests in production deploys
- Don't ignore failing tests
- Don't deploy without reviewing changes
- Don't share Vercel/Render tokens publicly

---

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Render Deploy Hooks](https://render.com/docs/deploy-hooks)
- [Codecov Documentation](https://docs.codecov.com)

---

## 🆘 Getting Help

If you encounter issues:

1. Check workflow logs in Actions tab
2. Review this guide's troubleshooting section
3. Check GitHub Actions [status page](https://www.githubstatus.com)
4. Review Vercel/Render service status

---

## ✨ Success Indicators

You'll know everything is working when:

- ✅ Green checkmarks on all commits
- ✅ Automated deployments after merging to main
- ✅ Coverage reports on pull requests
- ✅ Fast workflow execution (< 5 minutes)
- ✅ No manual deployment needed

---

**Last Updated:** 2026-02-08

**Need Help?** Open an issue in the repository or contact the team.
