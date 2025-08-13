#!/bin/bash

# Setup script for ABI sync workflow
# This script helps you configure the necessary GitHub secrets and permissions

echo "🚀 Setting up ABI Sync Workflow"
echo "================================"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Get repository information
REPO_URL=$(git remote get-url origin)
if [[ $REPO_URL == *"github.com"* ]]; then
    ORG_REPO=$(echo $REPO_URL | sed 's/.*github\.com[:/]\([^/]*\/[^/]*\)\.git.*/\1/')
    echo "✅ Detected GitHub repository: $ORG_REPO"
else
    echo "❌ Error: Not a GitHub repository"
    exit 1
fi

echo ""
echo "📋 Setup Steps:"
echo "==============="

echo ""
echo "1️⃣  Create GitHub Personal Access Token (PAT)"
echo "   - Go to GitHub Settings > Developer settings > Personal access tokens"
echo "   - Click 'Generate new token (classic)'"
echo "   - Give it a name like 'ABI Sync Token'"
echo "   - Select scopes:"
echo "     ✅ repo (Full control of private repositories)"
echo "     ✅ workflow (Update GitHub Action workflows)"
echo "   - Copy the generated token"

echo ""
echo "2️⃣  Add Repository Secret"
echo "   - Go to your repository: https://github.com/$ORG_REPO"
echo "   - Click Settings > Secrets and variables > Actions"
echo "   - Click 'New repository secret'"
echo "   - Name: BACKEND_REPOSITORY"
echo "   - Value: your-org/your-backend-repo-name"
echo "   - Example: assetrix/assetrix-backend"

echo ""
echo "3️⃣  Configure Repository Permissions"
echo "   - Go to Settings > Actions > General"
echo "   - Scroll down to 'Workflow permissions'"
echo "   - Select 'Read and write permissions'"
echo "   - Check 'Allow GitHub Actions to create and approve pull requests'"
echo "   - Click 'Save'"

echo ""
echo "4️⃣  Backend Repository Setup"
echo "   - Ensure your backend repository exists in the same organization"
echo "   - The backend repo should have this structure:"
echo "     src/"
echo "     ├── contracts/"
echo "     │   ├── abis/          (will be auto-created)"
echo "     │   ├── addresses/     (will be auto-created)"
echo "     │   └── metadata/      (will be auto-created)"
echo "     └── ..."

echo ""
echo "5️⃣  Test the Workflow"
echo "   - Make a change to any contract file"
echo "   - Commit and push to main branch"
echo "   - Check Actions tab to see the workflow run"
echo "   - Verify ABIs are synced to your backend repo"

echo ""
echo "🔧 Manual Workflow Trigger"
echo "   - Go to Actions tab in your repository"
echo "   - Click 'Sync ABIs to Backend Repository'"
echo "   - Click 'Run workflow' to test manually"

echo ""
echo "📁 Expected Backend Repository Structure After Sync:"
echo "=================================================="
echo "backend-repo/"
echo "├── src/"
echo "│   └── contracts/"
echo "│       ├── abis/"
echo "│       │   ├── FiatPaymentFacet.json"
echo "│       │   ├── InvestmentFacet.json"
echo "│       │   ├── PropertyFacet.json"
echo "│       │   ├── AdminFacet.json"
echo "│       │   ├── MilestoneFacet.json"
echo "│       │   ├── TransactionFacet.json"
echo "│       │   ├── DiamondLoupeFacet.json"
echo "│       │   ├── Diamond.json"
echo "│       │   └── MockStablecoin.json"
echo "│       ├── addresses/"
echo "│       │   └── contract-addresses.json"
echo "│       ├── metadata/"
echo "│       │   └── metadata.json"
echo "│       └── index.ts"
echo "└── ..."

echo ""
echo "💡 Usage in Backend Code:"
echo "========================"
echo ""
echo "// Import ABIs"
echo "import fiatPaymentAbi from './contracts/abis/FiatPaymentFacet.json';"
echo "import contractAddresses from './contracts/addresses/contract-addresses.json';"
echo ""
echo "// Use in ethers.js"
echo "const contract = new ethers.Contract("
echo "  contractAddresses.diamond,"
echo "  fiatPaymentAbi,"
echo "  provider"
echo ");"

echo ""
echo "✅ Setup complete! Follow the steps above to configure the workflow."
echo ""
echo "🔗 Useful Links:"
echo "   - Repository Settings: https://github.com/$ORG_REPO/settings"
echo "   - Actions: https://github.com/$ORG_REPO/actions"
echo "   - Secrets: https://github.com/$ORG_REPO/settings/secrets/actions"
