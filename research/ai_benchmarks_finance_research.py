#!/usr/bin/env python3
"""
Atlas Financial - AI Benchmarks & Evaluation Research
Research financial AI model benchmarks, evaluations, and real-world performance data
"""

import asyncio
import json
import time
from datetime import datetime
from typing import List, Dict, Any, Set
from pathlib import Path

from crawl4ai import AsyncWebCrawler, CrawlerRunConfig, CacheMode
from crawl4ai.deep_crawling import BestFirstCrawlingStrategy
from crawl4ai.deep_crawling.filters import (
    FilterChain,
    DomainFilter,
    URLPatternFilter,
    ContentTypeFilter,
    ContentRelevanceFilter
)
from crawl4ai.deep_crawling.scorers import KeywordRelevanceScorer
from crawl4ai.content_scraping_strategy import LXMLWebScrapingStrategy


class FinancialAIBenchmarkResearcher:
    """Research system for AI model benchmarks and evaluations in financial contexts"""

    def __init__(self):
        self.benchmark_data = {
            "financial_reasoning_benchmarks": [],
            "numerical_analysis_tests": [],
            "investment_accuracy_metrics": [],
            "accounting_validation_tests": [],
            "risk_assessment_benchmarks": [],
            "performance_comparisons": [],
            "resource_usage_analysis": [],
            "privacy_security_audits": [],
            "real_world_case_studies": [],
            "deployment_experiences": []
        }

        self.visited_domains = set()
        self.benchmark_results = []
        self.performance_metrics = {}

    def create_benchmark_filter_chain(self, allowed_domains: List[str]) -> FilterChain:
        """Create filter chain for benchmark and evaluation research"""
        return FilterChain([
            DomainFilter(
                allowed_domains=allowed_domains,
                blocked_domains=[
                    "facebook.com", "twitter.com", "linkedin.com",
                    "youtube.com", "instagram.com", "tiktok.com"
                ]
            ),

            URLPatternFilter(patterns=[
                "*benchmark*", "*evaluation*", "*test*", "*performance*",
                "*accuracy*", "*comparison*", "*analysis*", "*study*",
                "*results*", "*metrics*", "*validation*", "*assessment*",
                "*finance*", "*financial*", "*accounting*", "*investment*",
                "*leaderboard*", "*ranking*", "*score*", "*measurement*"
            ]),

            ContentTypeFilter(allowed_types=["text/html"]),

            ContentRelevanceFilter(
                query="AI model benchmark financial performance accuracy evaluation test results",
                threshold=0.7
            )
        ])

    def create_benchmark_scorer(self) -> KeywordRelevanceScorer:
        """Create scorer for benchmark and evaluation content"""
        return KeywordRelevanceScorer(
            keywords=[
                # Benchmark terms
                "benchmark", "evaluation", "test", "assessment", "validation",
                "performance", "accuracy", "precision", "recall", "f1-score",
                "metrics", "measurement", "comparison", "analysis",

                # Financial benchmarks
                "financial reasoning", "numerical analysis", "math capabilities",
                "investment analysis", "portfolio optimization", "risk assessment",
                "accounting accuracy", "financial planning", "budget analysis",
                "expense categorization", "transaction analysis",

                # Model performance
                "llm evaluation", "language model benchmark", "reasoning test",
                "problem solving", "logical reasoning", "mathematical reasoning",
                "quantitative analysis", "statistical analysis",

                # Technical metrics
                "tokens per second", "inference speed", "latency", "throughput",
                "memory usage", "cpu usage", "gpu usage", "resource consumption",
                "model size", "parameter count", "context length",

                # Quality metrics
                "hallucination rate", "factual accuracy", "consistency",
                "reliability", "robustness", "error rate", "failure modes",

                # Financial accuracy
                "calculation accuracy", "numerical precision", "financial facts",
                "market data accuracy", "regulatory compliance", "audit trail",
                "data integrity", "compliance validation",

                # Real-world performance
                "production deployment", "user experience", "practical application",
                "case study", "implementation results", "operational metrics",

                # Comparative analysis
                "model comparison", "head-to-head", "leaderboard", "ranking",
                "best performing", "top models", "state-of-the-art", "sota",

                # Financial domains
                "personal finance", "corporate finance", "investment banking",
                "wealth management", "financial advisory", "fintech",
                "robo-advisor", "algorithmic trading", "credit analysis"
            ],
            weight=0.95
        )

    async def research_benchmarks(self, crawler: AsyncWebCrawler, domain: str, topic: str, max_pages: int = 30):
        """Research benchmark and evaluation content"""
        print(f"\n📊 Researching {topic} on {domain}...")

        filter_chain = self.create_benchmark_filter_chain([domain])
        scorer = self.create_benchmark_scorer()

        config = CrawlerRunConfig(
            deep_crawl_strategy=BestFirstCrawlingStrategy(
                max_depth=3,
                max_pages=max_pages,
                include_external=False,
                filter_chain=filter_chain,
                url_scorer=scorer
            ),
            scraping_strategy=LXMLWebScrapingStrategy(),
            stream=True,
            cache_mode=CacheMode.BYPASS,
            verbose=True
        )

        results = []
        start_url = f"https://{domain}"

        try:
            async for result in await crawler.arun(url=start_url, config=config):
                if result.success:
                    score = result.metadata.get("score", 0)
                    depth = result.metadata.get("depth", 0)

                    benchmark_item = {
                        "url": result.url,
                        "topic": topic,
                        "domain": domain,
                        "score": score,
                        "depth": depth,
                        "title": result.metadata.get("title", ""),
                        "description": result.metadata.get("description", ""),
                        "content_preview": result.markdown.raw_markdown[:1000] if result.markdown else "",
                        "full_content": result.markdown.raw_markdown if result.markdown else "",
                        "timestamp": datetime.now().isoformat(),
                        "benchmark_indicators": self.extract_benchmark_indicators(result)
                    }

                    results.append(benchmark_item)
                    print(f"  ✓ Found: {result.url} (Score: {score:.2f})")

                    if score > 0.8:
                        self.performance_metrics[result.url] = {
                            "score": score,
                            "indicators": benchmark_item["benchmark_indicators"]
                        }

        except Exception as e:
            print(f"  ❌ Error researching {domain}: {str(e)}")

        return results

    def extract_benchmark_indicators(self, result) -> Dict[str, Any]:
        """Extract benchmark-specific indicators from content"""
        content = (result.markdown.raw_markdown if result.markdown else "").lower()

        indicators = {
            "has_numerical_results": False,
            "has_comparison_data": False,
            "has_financial_metrics": False,
            "performance_scores": [],
            "accuracy_percentages": [],
            "speed_metrics": [],
            "model_names": [],
            "benchmark_types": []
        }

        import re

        # Extract numerical results
        number_patterns = [r'\d+\.?\d*%', r'\d+\.?\d*\s*(fps|tps|ms|seconds)', r'score:?\s*\d+\.?\d*']
        for pattern in number_patterns:
            matches = re.findall(pattern, content)
            if matches:
                indicators["has_numerical_results"] = True
                indicators["performance_scores"].extend(matches[:5])  # Limit to 5

        # Extract accuracy percentages
        accuracy_pattern = r'(\d+\.?\d*)%?\s*(accuracy|precision|recall|f1)'
        accuracy_matches = re.findall(accuracy_pattern, content)
        if accuracy_matches:
            indicators["accuracy_percentages"] = [f"{match[0]}% {match[1]}" for match in accuracy_matches[:3]]

        # Extract speed metrics
        speed_patterns = [r'(\d+\.?\d*)\s*(tokens?/s|ms|seconds?)', r'(\d+\.?\d*)\s*tps']
        for pattern in speed_patterns:
            matches = re.findall(pattern, content)
            indicators["speed_metrics"].extend([f"{m[0]} {m[1]}" for m in matches[:3]])

        # Detect comparison data
        comparison_terms = ["vs", "versus", "compared to", "outperforms", "better than", "faster than"]
        indicators["has_comparison_data"] = any(term in content for term in comparison_terms)

        # Detect financial metrics
        financial_metrics = ["roi", "return on investment", "portfolio", "risk", "volatility", "sharpe ratio"]
        indicators["has_financial_metrics"] = any(metric in content for metric in financial_metrics)

        # Extract model names
        model_patterns = [r'(llama|gpt|claude|gemini|mistral|phi|qwen|deepseek)[\w\-\.]*',
                         r'(finbert|econbert)[\w\-\.]*']
        for pattern in model_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            indicators["model_names"].extend(matches[:5])

        # Identify benchmark types
        benchmark_types = ["math", "reasoning", "financial", "numerical", "accuracy", "speed", "memory"]
        indicators["benchmark_types"] = [bt for bt in benchmark_types if bt in content]

        return indicators

    async def comprehensive_benchmark_research(self):
        """Conduct comprehensive research on AI model benchmarks for finance"""
        print("🚀 Starting Comprehensive AI Benchmark Research for Financial Applications")
        print("=" * 80)

        research_targets = [
            # Academic benchmark sites
            ("paperswithcode.com", "Papers with Code - Benchmarks", 25),
            ("huggingface.co/spaces/HuggingFaceH4/open_llm_leaderboard", "Open LLM Leaderboard", 20),
            ("chat.lmsys.org", "Chatbot Arena", 15),

            # Evaluation frameworks
            ("github.com/EleutherAI/lm-evaluation-harness", "LM Evaluation Harness", 25),
            ("github.com/tatsu-lab/alpaca_eval", "Alpaca Eval Framework", 20),
            ("github.com/microsoft/promptflow", "PromptFlow Evaluation", 20),

            # Financial AI research
            ("arxiv.org", "Financial AI Papers", 20),
            ("aclanthology.org", "ACL Financial NLP", 15),
            ("proceedings.neurips.cc", "NeurIPS Financial ML", 15),

            # Industry benchmarks
            ("github.com/ai4finance-foundation", "AI4Finance Benchmarks", 25),
            ("github.com/microsoft/FinGPT", "FinGPT Evaluation", 20),
            ("github.com/chancefocus/PIXIU", "PIXIU Financial Benchmark", 20),

            # Performance testing
            ("github.com/vllm-project/vllm", "vLLM Performance", 20),
            ("github.com/ggerganov/llama.cpp", "Llama.cpp Benchmarks", 20),
            ("github.com/ollama/ollama", "Ollama Performance", 20),

            # Real-world case studies
            ("blog.langchain.dev", "LangChain Case Studies", 15),
            ("www.pinecone.io/blog", "Pinecone AI Applications", 15),
            ("blog.llamaindex.ai", "LlamaIndex Applications", 15),

            # Financial technology blogs
            ("eng.uber.com", "Uber Engineering - Financial AI", 10),
            ("netflixtechblog.com", "Netflix Tech - Finance ML", 10),
            ("medium.com/airbnb-engineering", "Airbnb - Financial Systems", 10),

            # Open source evaluation
            ("github.com/wandb/weave", "Weights & Biases Evaluation", 15),
            ("github.com/mlflow/mlflow", "MLflow Model Evaluation", 15),
            ("github.com/gradio-app/gradio", "Gradio Model Testing", 15),
        ]

        async with AsyncWebCrawler() as crawler:
            for domain, topic, max_pages in research_targets:
                if domain not in self.visited_domains:
                    self.visited_domains.add(domain)
                    results = await self.research_benchmarks(crawler, domain, topic, max_pages)
                    self.benchmark_results.extend(results)

                    self.categorize_benchmark_results(results)
                    await asyncio.sleep(2)

        self.save_benchmark_results()
        self.generate_benchmark_summary()
        self.generate_financial_ai_recommendations()

    def categorize_benchmark_results(self, results: List[Dict[str, Any]]):
        """Categorize benchmark results by specific types"""
        for result in results:
            content_lower = (result.get("content_preview", "") +
                           result.get("title", "") +
                           result.get("description", "")).lower()

            indicators = result.get("benchmark_indicators", {})

            # Financial reasoning benchmarks
            if any(term in content_lower for term in ["financial reasoning", "economic reasoning", "finance qa"]):
                self.benchmark_data["financial_reasoning_benchmarks"].append(result)

            # Numerical analysis
            if any(term in content_lower for term in ["math", "numerical", "calculation", "arithmetic"]):
                self.benchmark_data["numerical_analysis_tests"].append(result)

            # Investment accuracy
            if any(term in content_lower for term in ["investment", "portfolio", "market", "trading"]):
                self.benchmark_data["investment_accuracy_metrics"].append(result)

            # Accounting validation
            if any(term in content_lower for term in ["accounting", "bookkeeping", "audit", "compliance"]):
                self.benchmark_data["accounting_validation_tests"].append(result)

            # Risk assessment
            if any(term in content_lower for term in ["risk", "volatility", "var", "stress test"]):
                self.benchmark_data["risk_assessment_benchmarks"].append(result)

            # Performance comparisons
            if indicators.get("has_comparison_data"):
                self.benchmark_data["performance_comparisons"].append(result)

            # Resource usage
            if any(term in content_lower for term in ["memory", "cpu", "gpu", "resource", "efficiency"]):
                self.benchmark_data["resource_usage_analysis"].append(result)

            # Privacy/security
            if any(term in content_lower for term in ["privacy", "security", "audit", "compliance", "gdpr"]):
                self.benchmark_data["privacy_security_audits"].append(result)

            # Case studies
            if any(term in content_lower for term in ["case study", "real world", "production", "deployment"]):
                self.benchmark_data["real_world_case_studies"].append(result)

            # Deployment experiences
            if any(term in content_lower for term in ["deployment", "implementation", "setup", "installation"]):
                self.benchmark_data["deployment_experiences"].append(result)

    def save_benchmark_results(self):
        """Save benchmark research results"""
        output_dir = Path("/home/matt/Atlas-Financial/research/results/ai_benchmarks")
        output_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

        # Save all results
        with open(output_dir / f"benchmark_raw_{timestamp}.json", "w") as f:
            json.dump(self.benchmark_results, f, indent=2)

        with open(output_dir / f"benchmark_categorized_{timestamp}.json", "w") as f:
            json.dump(self.benchmark_data, f, indent=2)

        with open(output_dir / f"performance_metrics_{timestamp}.json", "w") as f:
            json.dump(self.performance_metrics, f, indent=2)

        print(f"\n💾 Benchmark research results saved to {output_dir}")

    def generate_benchmark_summary(self):
        """Generate summary of benchmark findings"""
        print("\n📊 AI Benchmark Research Summary")
        print("=" * 80)

        for category, items in self.benchmark_data.items():
            if items:
                print(f"\n{category.replace('_', ' ').title()}: {len(items)} resources found")

                # Show top 3 with metrics
                top_items = sorted(items, key=lambda x: x.get("score", 0), reverse=True)[:3]
                for i, item in enumerate(top_items, 1):
                    title = item.get('title', 'Unknown')[:60]
                    score = item.get('score', 0)
                    indicators = item.get('benchmark_indicators', {})

                    print(f"  {i}. {title}... (Score: {score:.2f})")

                    if indicators.get('accuracy_percentages'):
                        print(f"     Accuracy: {', '.join(indicators['accuracy_percentages'][:2])}")
                    if indicators.get('speed_metrics'):
                        print(f"     Speed: {', '.join(indicators['speed_metrics'][:2])}")
                    if indicators.get('model_names'):
                        print(f"     Models: {', '.join(set(indicators['model_names'][:3]))}")

                    print(f"     URL: {item['url']}")
                    print()

        print(f"\n📈 Total benchmark resources: {len(self.benchmark_results)}")
        print(f"🎯 High-scoring resources: {len(self.performance_metrics)}")

    def generate_financial_ai_recommendations(self):
        """Generate specific recommendations based on benchmark data"""
        print("\n🎯 Financial AI Model Recommendations Based on Benchmarks")
        print("=" * 80)

        # Analyze best performing categories
        best_financial = sorted(
            self.benchmark_data.get("financial_reasoning_benchmarks", []),
            key=lambda x: x.get("score", 0),
            reverse=True
        )[:3]

        best_numerical = sorted(
            self.benchmark_data.get("numerical_analysis_tests", []),
            key=lambda x: x.get("score", 0),
            reverse=True
        )[:3]

        best_performance = sorted(
            self.benchmark_data.get("performance_comparisons", []),
            key=lambda x: x.get("score", 0),
            reverse=True
        )[:3]

        print("🏆 Top Financial Reasoning Models:")
        for i, model in enumerate(best_financial, 1):
            print(f"  {i}. {model.get('title', 'Unknown')[:70]}")
            print(f"     Score: {model.get('score', 0):.2f}")
            if model.get('benchmark_indicators', {}).get('accuracy_percentages'):
                acc = model['benchmark_indicators']['accuracy_percentages'][0]
                print(f"     Accuracy: {acc}")
            print(f"     URL: {model.get('url', '')}")
            print()

        print("🧮 Top Numerical Analysis Models:")
        for i, model in enumerate(best_numerical, 1):
            print(f"  {i}. {model.get('title', 'Unknown')[:70]}")
            print(f"     Score: {model.get('score', 0):.2f}")
            if model.get('benchmark_indicators', {}).get('speed_metrics'):
                speed = model['benchmark_indicators']['speed_metrics'][0]
                print(f"     Speed: {speed}")
            print(f"     URL: {model.get('url', '')}")
            print()

        print("⚡ Top Performance Models:")
        for i, model in enumerate(best_performance, 1):
            print(f"  {i}. {model.get('title', 'Unknown')[:70]}")
            print(f"     Score: {model.get('score', 0):.2f}")
            print(f"     URL: {model.get('url', '')}")
            print()

        # Generate implementation strategy
        print("📋 Implementation Strategy for Atlas Financial:")
        print("  1. Prioritize models with proven financial reasoning capabilities")
        print("  2. Test numerical accuracy with financial calculations")
        print("  3. Benchmark local inference speed for real-time responses")
        print("  4. Validate privacy and security compliance")
        print("  5. Implement A/B testing framework for model comparison")


async def main():
    """Main benchmark research execution"""
    researcher = FinancialAIBenchmarkResearcher()
    await researcher.comprehensive_benchmark_research()


if __name__ == "__main__":
    asyncio.run(main())
