#!/bin/bash

# Atlas Financial - Quick Start AI Setup Script
# This script installs Ollama and recommended models for financial applications

set -e

echo "🚀 Atlas Financial - AI Setup Script"
echo "===================================="
echo "This script will install Ollama and recommended AI models for financial applications"
echo ""

# Check system requirements
echo "📋 Checking system requirements..."

# Check available RAM
RAM_GB=$(free -g | awk '/^Mem:/{print $2}')
echo "  Available RAM: ${RAM_GB}GB"

if [ "$RAM_GB" -lt 16 ]; then
    echo "  ⚠️  Warning: Less than 16GB RAM detected. Some models may not run optimally."
else
    echo "  ✅ RAM check passed"
fi

# Check available disk space
DISK_GB=$(df -BG / | awk 'NR==2{print $4}' | sed 's/G//')
echo "  Available disk space: ${DISK_GB}GB"

if [ "$DISK_GB" -lt 50 ]; then
    echo "  ⚠️  Warning: Less than 50GB free space. Model downloads may fail."
else
    echo "  ✅ Disk space check passed"
fi

echo ""

# Install Ollama
echo "🔧 Installing Ollama..."
if command -v ollama &> /dev/null; then
    echo "  ✅ Ollama already installed"
else
    echo "  📥 Downloading and installing Ollama..."
    curl -fsSL https://ollama.ai/install.sh | sh
    echo "  ✅ Ollama installed successfully"
fi

# Start Ollama service
echo "🚀 Starting Ollama service..."
if pgrep -x "ollama" > /dev/null; then
    echo "  ✅ Ollama already running"
else
    echo "  🔄 Starting Ollama service..."
    nohup ollama serve > /dev/null 2>&1 &
    sleep 5
    echo "  ✅ Ollama service started"
fi

# Function to download model with progress
download_model() {
    local model=$1
    local description=$2

    echo "📦 Downloading $description ($model)..."
    echo "  This may take several minutes depending on your internet connection..."

    if ollama list | grep -q "$model"; then
        echo "  ✅ $model already downloaded"
    else
        ollama pull "$model"
        echo "  ✅ $model downloaded successfully"
    fi
}

# Download recommended models based on system capabilities
echo ""
echo "📦 Downloading recommended AI models..."

# Always download the lightweight model for quick testing
download_model "llama3.3:8b" "Llama 3.3 8B (Quick Start Model)"

# Download medium model if enough RAM
if [ "$RAM_GB" -ge 24 ]; then
    download_model "qwen2.5:14b" "Qwen 2.5 14B (Balanced Performance)"
fi

# Download large model if enough RAM
if [ "$RAM_GB" -ge 32 ]; then
    download_model "qwen2.5:32b" "Qwen 2.5 32B (High Performance)"
fi

# Download very large model only if explicitly requested and enough RAM
if [ "$RAM_GB" -ge 48 ] && [ "$1" = "--full" ]; then
    download_model "llama3.3:70b" "Llama 3.3 70B (Maximum Capability)"
fi

echo ""
echo "🧪 Testing installation..."

# Test Ollama API
echo "  Testing Ollama API connection..."
if curl -s http://localhost:11434/api/version > /dev/null; then
    echo "  ✅ Ollama API responding"
else
    echo "  ❌ Ollama API not responding. Please check installation."
    exit 1
fi

# Test basic model inference
echo "  Testing model inference..."
response=$(ollama run llama3.3:8b "What is 2+2?" 2>/dev/null | head -1)
if [[ "$response" == *"4"* ]]; then
    echo "  ✅ Model inference working"
else
    echo "  ⚠️  Model inference test unclear. Response: $response"
fi

echo ""
echo "🎯 Installation Summary"
echo "======================"
echo "✅ Ollama installed and running"
echo "✅ AI models downloaded:"
ollama list

echo ""
echo "🚀 Quick Start Guide"
echo "==================="
echo "1. Test the AI with a financial question:"
echo "   ollama run llama3.3:8b \"Explain the difference between stocks and bonds\""
echo ""
echo "2. Use the API in your application:"
echo "   curl -X POST http://localhost:11434/api/generate \\"
echo "        -H \"Content-Type: application/json\" \\"
echo "        -d '{\"model\": \"llama3.3:8b\", \"prompt\": \"Your financial question here\", \"stream\": false}'"
echo ""
echo "3. Integrate with Atlas Financial using the implementation guide:"
echo "   cat /home/matt/Atlas-Financial/research/ai_implementation_guide.md"
echo ""

echo "🔒 Privacy Notes:"
echo "- All processing happens locally on your machine"
echo "- No data is sent to external services"
echo "- Models run completely offline after download"
echo ""

echo "📊 Performance Tips:"
echo "- Use llama3.3:8b for quick responses"
if [ "$RAM_GB" -ge 24 ]; then
    echo "- Use qwen2.5:14b for better financial reasoning"
fi
if [ "$RAM_GB" -ge 32 ]; then
    echo "- Use qwen2.5:32b for complex financial analysis"
fi
echo "- Restart Ollama if models seem slow: sudo systemctl restart ollama"
echo ""

echo "✅ Setup complete! Your privacy-first AI CFO is ready to use."
echo ""
echo "📚 Next Steps:"
echo "1. Review the detailed implementation guide"
echo "2. Test financial queries with your downloaded models"
echo "3. Integrate with Atlas Financial codebase"
echo "4. Setup monitoring and performance tracking"
echo ""

# Show available models and their use cases
echo "🎯 Model Recommendations by Use Case:"
echo ""
echo "📈 Quick Financial Q&A:"
echo "  ollama run llama3.3:8b \"Your question here\""
echo ""

if [ "$RAM_GB" -ge 24 ]; then
echo "🧮 Financial Calculations & Analysis:"
echo "  ollama run qwen2.5:14b \"Your complex financial question here\""
echo ""
fi

if [ "$RAM_GB" -ge 32 ]; then
echo "💼 Advanced Portfolio Analysis:"
echo "  ollama run qwen2.5:32b \"Your advanced financial analysis request here\""
echo ""
fi

echo "Need help? Check the documentation:"
echo "- Implementation Guide: /home/matt/Atlas-Financial/research/ai_implementation_guide.md"
echo "- Research Results: /home/matt/Atlas-Financial/research/results/"
echo "- Ollama Documentation: https://ollama.ai/docs"
echo ""

echo "🎉 Happy financial AI building!"
