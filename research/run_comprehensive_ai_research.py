#!/usr/bin/env python3
"""
Atlas Financial - Comprehensive AI Research Orchestrator
Master script to run all AI model research and generate unified analysis
"""

import asyncio
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any

class AIResearchOrchestrator:
    """Orchestrates comprehensive AI model research for financial applications"""

    def __init__(self):
        self.research_dir = Path("/home/matt/Atlas-Financial/research")
        self.results_dir = self.research_dir / "results"
        self.results_dir.mkdir(parents=True, exist_ok=True)

        self.unified_results = {
            "execution_summary": {},
            "model_recommendations": {},
            "benchmark_analysis": {},
            "implementation_roadmap": {},
            "privacy_security_analysis": {},
            "performance_comparison": {},
            "cost_benefit_analysis": {}
        }

    async def run_model_research(self):
        """Run the AI models research script"""
        print("🔍 Phase 1: Executing AI Models Research...")
        print("=" * 60)

        try:
            # Run the AI models research script
            process = await asyncio.create_subprocess_exec(
                sys.executable,
                str(self.research_dir / "ai_models_finance_research.py"),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            stdout, stderr = await process.communicate()

            if process.returncode == 0:
                print("✅ AI Models Research completed successfully")
                self.unified_results["execution_summary"]["models_research"] = {
                    "status": "success",
                    "timestamp": datetime.now().isoformat()
                }
            else:
                print(f"❌ AI Models Research failed: {stderr.decode()}")
                self.unified_results["execution_summary"]["models_research"] = {
                    "status": "failed",
                    "error": stderr.decode(),
                    "timestamp": datetime.now().isoformat()
                }

        except Exception as e:
            print(f"❌ Error running AI models research: {str(e)}")
            self.unified_results["execution_summary"]["models_research"] = {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

    async def run_benchmark_research(self):
        """Run the benchmark research script"""
        print("\n📊 Phase 2: Executing Benchmark Research...")
        print("=" * 60)

        try:
            # Run the benchmark research script
            process = await asyncio.create_subprocess_exec(
                sys.executable,
                str(self.research_dir / "ai_benchmarks_finance_research.py"),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            stdout, stderr = await process.communicate()

            if process.returncode == 0:
                print("✅ Benchmark Research completed successfully")
                self.unified_results["execution_summary"]["benchmark_research"] = {
                    "status": "success",
                    "timestamp": datetime.now().isoformat()
                }
            else:
                print(f"❌ Benchmark Research failed: {stderr.decode()}")
                self.unified_results["execution_summary"]["benchmark_research"] = {
                    "status": "failed",
                    "error": stderr.decode(),
                    "timestamp": datetime.now().isoformat()
                }

        except Exception as e:
            print(f"❌ Error running benchmark research: {str(e)}")
            self.unified_results["execution_summary"]["benchmark_research"] = {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

    def load_research_results(self) -> Dict[str, Any]:
        """Load and combine results from both research phases"""
        print("\n📄 Phase 3: Loading and Analyzing Results...")
        print("=" * 60)

        combined_data = {
            "models_data": {},
            "benchmark_data": {},
            "latest_files": {}
        }

        # Find latest model research files
        models_dir = self.results_dir / "ai_models"
        if models_dir.exists():
            model_files = list(models_dir.glob("ai_models_categorized_*.json"))
            if model_files:
                latest_model_file = max(model_files, key=lambda f: f.stat().st_mtime)
                with open(latest_model_file) as f:
                    combined_data["models_data"] = json.load(f)
                combined_data["latest_files"]["models"] = str(latest_model_file)
                print(f"📁 Loaded models data from: {latest_model_file.name}")

        # Find latest benchmark research files
        benchmark_dir = self.results_dir / "ai_benchmarks"
        if benchmark_dir.exists():
            benchmark_files = list(benchmark_dir.glob("benchmark_categorized_*.json"))
            if benchmark_files:
                latest_benchmark_file = max(benchmark_files, key=lambda f: f.stat().st_mtime)
                with open(latest_benchmark_file) as f:
                    combined_data["benchmark_data"] = json.load(f)
                combined_data["latest_files"]["benchmarks"] = str(latest_benchmark_file)
                print(f"📁 Loaded benchmark data from: {latest_benchmark_file.name}")

        return combined_data

    def analyze_model_recommendations(self, data: Dict[str, Any]):
        """Analyze and generate model recommendations"""
        models_data = data.get("models_data", {})
        benchmark_data = data.get("benchmark_data", {})

        recommendations = {
            "tier_1_models": [],  # Best overall for financial applications
            "tier_2_models": [],  # Good alternatives
            "specialized_models": [],  # Domain-specific models
            "local_inference_leaders": [],
            "privacy_champions": [],
            "performance_leaders": []
        }

        # Analyze Hugging Face models
        hf_models = models_data.get("huggingface_models", [])
        financial_models = models_data.get("financial_specific_models", [])
        local_models = models_data.get("local_inference_engines", [])
        privacy_models = models_data.get("privacy_first_options", [])

        # Score and rank models
        all_models = []
        for category, models in models_data.items():
            for model in models:
                model_score = self.calculate_model_score(model, category)
                all_models.append({
                    "model": model,
                    "category": category,
                    "score": model_score
                })

        # Sort by score and categorize
        all_models.sort(key=lambda x: x["score"], reverse=True)

        # Top tier (score > 0.8)
        recommendations["tier_1_models"] = [
            m["model"] for m in all_models[:10] if m["score"] > 0.8
        ]

        # Second tier (score > 0.6)
        recommendations["tier_2_models"] = [
            m["model"] for m in all_models[10:20] if m["score"] > 0.6
        ]

        # Specialized models
        recommendations["specialized_models"] = financial_models[:5]
        recommendations["local_inference_leaders"] = local_models[:5]
        recommendations["privacy_champions"] = privacy_models[:5]

        self.unified_results["model_recommendations"] = recommendations
        return recommendations

    def calculate_model_score(self, model: Dict[str, Any], category: str) -> float:
        """Calculate a weighted score for model ranking"""
        base_score = model.get("score", 0.0)
        indicators = model.get("model_indicators", {})

        # Weight factors
        weights = {
            "financial_specific": 0.3,
            "local_inference": 0.25,
            "quantized": 0.15,
            "multimodal": 0.1,
            "category_bonus": 0.2
        }

        final_score = base_score

        # Apply bonuses
        if indicators.get("is_financial_specific"):
            final_score += weights["financial_specific"]

        if indicators.get("is_local_inference"):
            final_score += weights["local_inference"]

        if indicators.get("is_quantized"):
            final_score += weights["quantized"]

        if indicators.get("is_multimodal"):
            final_score += weights["multimodal"]

        # Category bonuses
        if category in ["financial_specific_models", "huggingface_models"]:
            final_score += weights["category_bonus"]

        return min(final_score, 1.0)  # Cap at 1.0

    def generate_implementation_roadmap(self, recommendations: Dict[str, Any]):
        """Generate implementation roadmap for Atlas Financial"""
        roadmap = {
            "phase_1_immediate": {
                "timeline": "Weeks 1-2",
                "goals": ["Setup local inference", "Test basic models", "Establish baselines"],
                "actions": []
            },
            "phase_2_integration": {
                "timeline": "Weeks 3-6",
                "goals": ["Integrate financial models", "Build evaluation framework", "Performance optimization"],
                "actions": []
            },
            "phase_3_production": {
                "timeline": "Weeks 7-12",
                "goals": ["Production deployment", "Monitoring setup", "Continuous improvement"],
                "actions": []
            }
        }

        # Phase 1 actions
        if recommendations.get("local_inference_leaders"):
            top_local = recommendations["local_inference_leaders"][0]
            roadmap["phase_1_immediate"]["actions"].extend([
                f"Install and configure Ollama for local inference",
                f"Test {top_local.get('title', 'top local model')} for basic financial tasks",
                "Establish performance baselines and accuracy metrics",
                "Setup development environment and testing framework"
            ])

        # Phase 2 actions
        if recommendations.get("tier_1_models"):
            top_model = recommendations["tier_1_models"][0]
            roadmap["phase_2_integration"]["actions"].extend([
                f"Integrate {top_model.get('title', 'top financial model')} for specialized tasks",
                "Develop financial task evaluation suite",
                "Implement model switching logic for different use cases",
                "Optimize for memory usage and response time"
            ])

        # Phase 3 actions
        roadmap["phase_3_production"]["actions"].extend([
            "Deploy production-ready inference pipeline",
            "Implement monitoring and logging",
            "Setup A/B testing for model comparison",
            "Develop feedback loop for continuous improvement"
        ])

        self.unified_results["implementation_roadmap"] = roadmap
        return roadmap

    def analyze_privacy_security(self, data: Dict[str, Any]):
        """Analyze privacy and security implications"""
        models_data = data.get("models_data", {})
        benchmark_data = data.get("benchmark_data", {})

        privacy_analysis = {
            "fully_local_models": [],
            "hybrid_safe_models": [],
            "security_considerations": [],
            "compliance_notes": [],
            "data_protection_strategies": []
        }

        # Analyze local inference options
        local_models = models_data.get("privacy_first_options", [])
        for model in local_models:
            if model.get("model_indicators", {}).get("is_local_inference"):
                privacy_analysis["fully_local_models"].append({
                    "name": model.get("title", "Unknown"),
                    "url": model.get("url", ""),
                    "score": model.get("score", 0),
                    "privacy_features": "Complete local processing"
                })

        # Security considerations
        privacy_analysis["security_considerations"] = [
            "All financial data processing should remain local",
            "Model weights should be verified for integrity",
            "Regular security updates for inference engines",
            "Encrypted storage for model files and user data",
            "Network isolation for air-gapped deployment options"
        ]

        # Compliance notes
        privacy_analysis["compliance_notes"] = [
            "GDPR: Local processing eliminates data transfer concerns",
            "SOX: Audit trails possible with local logging",
            "PCI DSS: No payment data exposure to external services",
            "Financial regulations: Complete data sovereignty"
        ]

        self.unified_results["privacy_security_analysis"] = privacy_analysis
        return privacy_analysis

    def generate_performance_comparison(self, data: Dict[str, Any]):
        """Generate performance comparison matrix"""
        models_data = data.get("models_data", {})
        benchmark_data = data.get("benchmark_data", {})

        comparison = {
            "inference_speed_leaders": [],
            "accuracy_leaders": [],
            "resource_efficiency_leaders": [],
            "overall_balanced": []
        }

        # Analyze benchmark data for performance insights
        performance_data = benchmark_data.get("performance_comparisons", [])
        numerical_tests = benchmark_data.get("numerical_analysis_tests", [])

        # Create performance matrix
        all_models = []
        for category, models in models_data.items():
            for model in models:
                performance_score = self.calculate_performance_score(model)
                all_models.append({
                    "name": model.get("title", "Unknown"),
                    "url": model.get("url", ""),
                    "category": category,
                    "performance_score": performance_score,
                    "indicators": model.get("model_indicators", {})
                })

        # Sort and categorize
        all_models.sort(key=lambda x: x["performance_score"], reverse=True)

        comparison["overall_balanced"] = all_models[:10]
        comparison["inference_speed_leaders"] = [
            m for m in all_models if m["indicators"].get("is_quantized")
        ][:5]

        self.unified_results["performance_comparison"] = comparison
        return comparison

    def calculate_performance_score(self, model: Dict[str, Any]) -> float:
        """Calculate performance score based on multiple factors"""
        base_score = model.get("score", 0.0)
        indicators = model.get("model_indicators", {})

        # Performance factors
        score = base_score

        if indicators.get("is_quantized"):
            score += 0.2  # Faster inference

        if indicators.get("is_local_inference"):
            score += 0.15  # No network latency

        if indicators.get("model_size"):
            # Smaller models get bonus for efficiency
            size_str = indicators["model_size"].lower()
            if "7b" in size_str or "3b" in size_str:
                score += 0.1
            elif "13b" in size_str:
                score += 0.05

        return min(score, 1.0)

    def save_unified_results(self):
        """Save the unified research results"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_file = self.results_dir / f"unified_ai_research_{timestamp}.json"

        with open(output_file, "w") as f:
            json.dump(self.unified_results, f, indent=2)

        print(f"\n💾 Unified research results saved to: {output_file}")
        return output_file

    def generate_executive_summary(self):
        """Generate executive summary report"""
        print("\n📋 Executive Summary: AI Models for Atlas Financial CFO")
        print("=" * 70)

        # Model recommendations summary
        recommendations = self.unified_results.get("model_recommendations", {})
        tier_1 = recommendations.get("tier_1_models", [])
        local_leaders = recommendations.get("local_inference_leaders", [])

        print(f"🏆 Top Model Recommendations:")
        if tier_1:
            for i, model in enumerate(tier_1[:3], 1):
                name = model.get("title", "Unknown")[:60]
                score = model.get("score", 0)
                print(f"  {i}. {name} (Score: {score:.2f})")

        print(f"\n🔒 Best Local Inference Options:")
        if local_leaders:
            for i, model in enumerate(local_leaders[:3], 1):
                name = model.get("title", "Unknown")[:60]
                print(f"  {i}. {name}")

        # Implementation roadmap summary
        roadmap = self.unified_results.get("implementation_roadmap", {})
        print(f"\n📅 Implementation Timeline:")
        for phase, details in roadmap.items():
            timeline = details.get("timeline", "Unknown")
            goals = details.get("goals", [])
            print(f"  {phase.replace('_', ' ').title()}: {timeline}")
            for goal in goals[:2]:  # Show first 2 goals
                print(f"    - {goal}")

        # Privacy summary
        privacy = self.unified_results.get("privacy_security_analysis", {})
        local_models = privacy.get("fully_local_models", [])
        print(f"\n🔐 Privacy & Security:")
        print(f"  - Fully local models found: {len(local_models)}")
        print(f"  - Complete data sovereignty possible")
        print(f"  - GDPR/SOX/PCI DSS compliant when deployed locally")

        # Performance summary
        performance = self.unified_results.get("performance_comparison", {})
        balanced = performance.get("overall_balanced", [])
        print(f"\n⚡ Performance Insights:")
        if balanced:
            best = balanced[0]
            print(f"  - Top balanced model: {best.get('name', 'Unknown')[:50]}")
            print(f"  - Performance score: {best.get('performance_score', 0):.2f}")

        print(f"\n📊 Research Statistics:")
        execution = self.unified_results.get("execution_summary", {})
        models_status = execution.get("models_research", {}).get("status", "unknown")
        benchmark_status = execution.get("benchmark_research", {}).get("status", "unknown")
        print(f"  - Models research: {models_status}")
        print(f"  - Benchmark research: {benchmark_status}")
        print(f"  - Total categories analyzed: {len(self.unified_results)}")

    async def run_comprehensive_research(self):
        """Run the complete research pipeline"""
        print("🚀 Atlas Financial - Comprehensive AI Models Research")
        print("🎯 Goal: Find optimal AI models for Personal CFO system")
        print("=" * 70)

        # Phase 1: Model research
        await self.run_model_research()

        # Phase 2: Benchmark research
        await self.run_benchmark_research()

        # Phase 3: Analysis and unification
        data = self.load_research_results()

        if data["models_data"] or data["benchmark_data"]:
            print("✅ Research data loaded successfully")

            # Generate analyses
            recommendations = self.analyze_model_recommendations(data)
            roadmap = self.generate_implementation_roadmap(recommendations)
            privacy_analysis = self.analyze_privacy_security(data)
            performance_comparison = self.generate_performance_comparison(data)

            # Save unified results
            output_file = self.save_unified_results()

            # Generate executive summary
            self.generate_executive_summary()

            print(f"\n🎉 Comprehensive AI research completed successfully!")
            print(f"📄 Detailed results available in: {output_file}")

        else:
            print("❌ No research data was loaded. Check if research scripts executed successfully.")


async def main():
    """Main orchestrator execution"""
    orchestrator = AIResearchOrchestrator()
    await orchestrator.run_comprehensive_research()


if __name__ == "__main__":
    asyncio.run(main())
