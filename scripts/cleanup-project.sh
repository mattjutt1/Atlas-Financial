#!/bin/bash

# Atlas Financial - Project Cleanup Script
# Removes build artifacts, caches, and unused files to reclaim storage

set -e

echo "🧹 Atlas Financial - Project Cleanup Script"
echo "==========================================="
echo "Current project size:"
du -sh /home/matt/Atlas-Financial/
echo ""

# Function to safely remove directories/files
safe_remove() {
    local path="$1"
    local description="$2"

    if [ -e "$path" ]; then
        local size=$(du -sh "$path" 2>/dev/null | cut -f1 || echo "unknown")
        echo "🗑️  Removing $description ($size): $path"
        rm -rf "$path"
    else
        echo "✅ Already clean: $path"
    fi
}

# Function to count and remove files by pattern
clean_by_pattern() {
    local pattern="$1"
    local description="$2"

    local count=$(find . -name "$pattern" -type f | wc -l)
    if [ $count -gt 0 ]; then
        echo "🗑️  Removing $count $description files"
        find . -name "$pattern" -type f -delete
    else
        echo "✅ No $description files found"
    fi
}

echo "📊 Storage Analysis Before Cleanup:"
echo "├── Rust target/: $(du -sh ./services/rust-financial-engine/target 2>/dev/null | cut -f1 || echo 'N/A')"
echo "├── Python venv: $(du -sh ./research/ai_research_env 2>/dev/null | cut -f1 || echo 'N/A')"
echo "├── Node modules: $(du -sh ./node_modules 2>/dev/null | cut -f1 || echo 'N/A')"
echo "├── Python cache: $(find . -name "__pycache__" -type d | wc -l) directories"
echo "└── Python bytecode: $(find . -name "*.pyc" -type f | wc -l) files"
echo ""

echo "🚀 Starting cleanup process..."
echo ""

# 1. Remove Rust build artifacts (3.8GB)
echo "1️⃣  Cleaning Rust build artifacts..."
safe_remove "./services/rust-financial-engine/target" "Rust build artifacts"
safe_remove "./services/ai-engine/target" "AI engine Rust artifacts"
find . -name "Cargo.lock" -type f -delete 2>/dev/null || true
echo ""

# 2. Remove Python virtual environment (620MB)
echo "2️⃣  Cleaning Python virtual environments..."
safe_remove "./research/ai_research_env" "Python virtual environment"
safe_remove "./research/venv" "Additional Python venv"
safe_remove "./venv" "Root Python venv"
echo ""

# 3. Remove Python cache and bytecode (7,211 files + 948 dirs)
echo "3️⃣  Cleaning Python cache and bytecode..."
find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
clean_by_pattern "*.pyc" "Python bytecode"
clean_by_pattern "*.pyo" "Python optimized bytecode"
echo ""

# 4. Remove TypeScript build artifacts
echo "4️⃣  Cleaning TypeScript build artifacts..."
clean_by_pattern "*.tsbuildinfo" "TypeScript build info"
safe_remove "./apps/web/.next" "Next.js build cache"
safe_remove "./packages/atlas-shared/dist" "Shared package build"
echo ""

# 5. Remove development artifacts and temp files
echo "5️⃣  Cleaning development artifacts..."
clean_by_pattern "*.log" "log"
clean_by_pattern "*.tmp" "temporary"
clean_by_pattern "*~" "backup"
clean_by_pattern "*.bak" "backup"
safe_remove "./.next" "Next.js cache"
safe_remove "./coverage" "test coverage"
echo ""

# 6. Remove Docker build context (if any)
echo "6️⃣  Cleaning Docker artifacts..."
safe_remove "./docker-build-context" "Docker build context"
echo ""

# 7. Remove research artifacts that are no longer needed
echo "7️⃣  Cleaning research artifacts..."
safe_remove "./research/results/crawl_*" "Old crawl results"
safe_remove "./research/test_*.py" "Test research scripts"
echo ""

# 8. Remove IDE and OS artifacts
echo "8️⃣  Cleaning IDE and OS artifacts..."
safe_remove "./.vscode" "VS Code settings"
safe_remove "./.idea" "IntelliJ settings"
clean_by_pattern ".DS_Store" "macOS metadata"
clean_by_pattern "Thumbs.db" "Windows metadata"
echo ""

# 9. Clean up duplicate cookie/header files in web app
echo "9️⃣  Cleaning duplicate test files..."
safe_remove "./apps/web/auth_cookies.txt" "test cookie files"
safe_remove "./apps/web/clean_cookies.txt" "test cookie files"
safe_remove "./apps/web/clean_headers.txt" "test header files"
safe_remove "./apps/web/final_cookies.txt" "test cookie files"
safe_remove "./apps/web/final_headers.txt" "test header files"
safe_remove "./apps/web/headers.txt" "test header files"
safe_remove "./apps/web/new_cookies.txt" "test cookie files"
safe_remove "./apps/web/test_cookies.txt" "test cookie files"
echo ""

echo "✅ Cleanup Complete!"
echo ""
echo "📊 Storage Analysis After Cleanup:"
du -sh /home/matt/Atlas-Financial/
echo ""

echo "💡 To prevent future accumulation:"
echo "├── Run 'cargo clean' after Rust development"
echo "├── Use virtual environments in project-local directories"
echo "├── Add common artifacts to .gitignore"
echo "├── Run this cleanup script monthly: ./scripts/cleanup-project.sh"
echo "└── Use 'npm ci' instead of 'npm install' when possible"
echo ""

echo "🔧 Rebuilding essential components..."
echo "Run these commands to restore development environment:"
echo "1. Rust: cd services/rust-financial-engine && cargo build"
echo "2. Shared: cd packages/atlas-shared && npm run build"
echo "3. Web: cd apps/web && npm run build"
echo ""

echo "🎉 Project cleanup successful!"
