#!/usr/bin/env python3
"""
Atlas Financial - AI Models Deep Research System
Comprehensive research on open source AI models for financial applications in 2025
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


class FinancialAIModelsResearcher:
    """Deep crawl system for researching AI models specifically for financial applications"""

    def __init__(self):
        self.research_data = {
            "huggingface_models": [],
            "local_inference_engines": [],
            "financial_specific_models": [],
            "multimodal_models": [],
            "performance_benchmarks": [],
            "privacy_first_options": [],
            "hybrid_approaches": [],
            "quantized_models": [],
            "fine_tuned_finance": [],
            "deployment_guides": []
        }

        self.visited_domains = set()
        self.research_results = []
        self.financial_model_scores = {}

    def create_ai_finance_filter_chain(self, allowed_domains: List[str]) -> FilterChain:
        """Create comprehensive filter chain for AI finance model research"""
        return FilterChain([
            # Domain filtering
            DomainFilter(
                allowed_domains=allowed_domains,
                blocked_domains=[
                    "facebook.com", "twitter.com", "linkedin.com",
                    "youtube.com", "instagram.com", "tiktok.com",
                    "reddit.com", "pinterest.com"
                ]
            ),

            # URL pattern filtering for AI/ML content
            URLPatternFilter(patterns=[
                "*models*", "*ai*", "*llm*", "*finance*", "*financial*",
                "*quantized*", "*inference*", "*local*", "*ollama*",
                "*huggingface*", "*transformers*", "*gguf*", "*ggml*",
                "*benchmark*", "*performance*", "*privacy*", "*deployment*",
                "*accounting*", "*investment*", "*analysis*", "*2025*",
                "*documentation*", "*guide*", "*tutorial*", "*setup*",
                "*recommendation*", "*comparison*", "*evaluation*"
            ]),

            # Content type filtering
            ContentTypeFilter(allowed_types=["text/html"]),

            # Content relevance filtering
            ContentRelevanceFilter(
                query="AI models financial analysis local inference privacy ollama huggingface quantized 2025",
                threshold=0.6
            )
        ])

    def create_ai_finance_scorer(self) -> KeywordRelevanceScorer:
        """Create keyword scorer for AI finance model content"""
        return KeywordRelevanceScorer(
            keywords=[
                # Core AI/ML terms
                "llm", "large language model", "ai model", "machine learning",
                "neural network", "transformer", "gpt", "llama", "mistral",
                "gemma", "qwen", "phi", "code llama", "deepseek",

                # Financial AI specific
                "financial ai", "finance llm", "accounting ai", "investment model",
                "financial analysis", "financial reasoning", "finbert", "econbert",
                "financial nlp", "quantitative analysis", "risk assessment",

                # Local inference
                "local inference", "offline ai", "edge ai", "on-device",
                "privacy preserving", "local deployment", "self-hosted",
                "no data sharing", "air-gapped", "private ai",

                # Inference engines
                "ollama", "lm studio", "gpt4all", "localai", "vllm",
                "text-generation-webui", "koboldcpp", "exllama",
                "llamacpp", "candle", "mlx", "transformers.js",

                # Model formats & optimization
                "gguf", "ggml", "quantized", "4-bit", "8-bit", "awq",
                "gptq", "exl2", "q4_k_m", "q5_k_m", "q8_0",
                "model compression", "pruning", "distillation",

                # Performance & benchmarks
                "benchmark", "evaluation", "performance", "accuracy",
                "speed", "latency", "throughput", "memory usage",
                "tokens per second", "inference time", "model size",

                # Financial tasks
                "transaction categorization", "budget optimization", "portfolio analysis",
                "risk assessment", "market analysis", "financial planning",
                "retirement planning", "monte carlo", "cash flow analysis",
                "expense tracking", "investment advice", "tax analysis",

                # Multi-modal capabilities
                "multimodal", "vision language", "document analysis",
                "pdf parsing", "table extraction", "chart analysis",
                "receipt processing", "financial documents",

                # Technical specs
                "context length", "reasoning", "math capabilities",
                "numerical analysis", "structured output", "json mode",
                "function calling", "tool use", "api integration",

                # 2025 relevance
                "2025", "latest", "new", "recent", "updated", "current",
                "state of the art", "sota", "cutting edge", "modern"
            ],
            weight=0.9
        )

    async def research_domain(self, crawler: AsyncWebCrawler, domain: str, topic: str, max_pages: int = 25):
        """Research a specific domain for AI finance model content"""
        print(f"\n🔍 Researching {topic} on {domain}...")

        # Create targeted filter and scorer
        filter_chain = self.create_ai_finance_filter_chain([domain])
        scorer = self.create_ai_finance_scorer()

        # Configure deep crawl strategy
        config = CrawlerRunConfig(
            deep_crawl_strategy=BestFirstCrawlingStrategy(
                max_depth=4,  # Deeper for model repositories
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

                    # Extract model-specific information
                    research_item = {
                        "url": result.url,
                        "topic": topic,
                        "domain": domain,
                        "score": score,
                        "depth": depth,
                        "title": result.metadata.get("title", ""),
                        "description": result.metadata.get("description", ""),
                        "content_preview": result.markdown.raw_markdown[:800] if result.markdown else "",
                        "full_content": result.markdown.raw_markdown if result.markdown else "",
                        "timestamp": datetime.now().isoformat(),
                        "model_indicators": self.extract_model_indicators(result)
                    }

                    results.append(research_item)
                    print(f"  ✓ Found: {result.url} (Score: {score:.2f}, Depth: {depth})")

                    # Track model scores for ranking
                    if score > 0.7:
                        self.financial_model_scores[result.url] = score

        except Exception as e:
            print(f"  ❌ Error researching {domain}: {str(e)}")

        return results

    def extract_model_indicators(self, result) -> Dict[str, Any]:
        """Extract AI model specific indicators from content"""
        content = (result.markdown.raw_markdown if result.markdown else "").lower()
        title = result.metadata.get("title", "").lower()

        indicators = {
            "is_financial_specific": False,
            "is_quantized": False,
            "is_local_inference": False,
            "is_multimodal": False,
            "model_size": None,
            "context_length": None,
            "performance_metrics": [],
            "deployment_options": []
        }

        # Financial specific detection
        financial_terms = ["finance", "financial", "accounting", "investment", "finbert", "econbert"]
        indicators["is_financial_specific"] = any(term in content for term in financial_terms)

        # Quantization detection
        quant_terms = ["quantized", "gguf", "ggml", "q4", "q5", "q8", "awq", "gptq", "4-bit", "8-bit"]
        indicators["is_quantized"] = any(term in content for term in quant_terms)

        # Local inference detection
        local_terms = ["ollama", "local", "offline", "on-device", "self-hosted", "privacy"]
        indicators["is_local_inference"] = any(term in content for term in local_terms)

        # Multimodal detection
        multimodal_terms = ["multimodal", "vision", "document", "image", "pdf", "chart"]
        indicators["is_multimodal"] = any(term in content for term in multimodal_terms)

        # Extract model size patterns
        import re
        size_patterns = [r'(\d+\.?\d*)\s*b', r'(\d+\.?\d*)\s*billion', r'(\d+)\s*parameters']
        for pattern in size_patterns:
            match = re.search(pattern, content)
            if match:
                indicators["model_size"] = match.group(1) + "B parameters"
                break

        # Extract context length
        context_patterns = [r'(\d+k?)\s*context', r'(\d+k?)\s*tokens', r'context.*?(\d+k?)']
        for pattern in context_patterns:
            match = re.search(pattern, content)
            if match:
                indicators["context_length"] = match.group(1)
                break

        return indicators

    async def comprehensive_ai_models_research(self):
        """Conduct comprehensive research on AI models for financial applications"""
        print("🚀 Starting Comprehensive AI Models Research for Financial Applications 2025")
        print("=" * 80)

        # Define research targets focused on AI models
        research_targets = [
            # Hugging Face Ecosystem
            ("huggingface.co/models", "Hugging Face - Financial Models", 30),
            ("huggingface.co/microsoft", "Microsoft Financial Models", 20),
            ("huggingface.co/meta-llama", "Meta Llama Models", 25),
            ("huggingface.co/mistralai", "Mistral AI Models", 20),
            ("huggingface.co/google", "Google/Gemma Models", 20),
            ("huggingface.co/Qwen", "Qwen Models", 20),
            ("huggingface.co/deepseek-ai", "DeepSeek Models", 20),

            # Local Inference Engines
            ("ollama.ai", "Ollama - Local AI", 25),
            ("lmstudio.ai", "LM Studio", 20),
            ("gpt4all.io", "GPT4All", 20),
            ("localai.io", "LocalAI", 20),
            ("github.com/ggerganov/llama.cpp", "Llama.cpp", 25),
            ("github.com/vllm-project/vllm", "vLLM", 20),

            # Financial-Specific Models & Research
            ("github.com/ai4finance-foundation", "AI4Finance Foundation", 25),
            ("github.com/microsoft/FinGPT", "FinGPT", 20),
            ("arxiv.org", "Financial AI Research Papers", 15),
            ("papers.nips.cc", "NeurIPS Financial AI", 10),
            ("www.semanticscholar.org", "Semantic Scholar Financial AI", 15),

            # Performance & Benchmarks
            ("github.com/EleutherAI/lm-evaluation-harness", "LM Evaluation Harness", 20),
            ("github.com/tatsu-lab/alpaca_eval", "Alpaca Eval", 15),
            ("github.com/WisdomShell/FreeEval", "FreeEval", 15),
            ("open-llm-leaderboard.github.io", "Open LLM Leaderboard", 15),

            # Model Quantization & Optimization
            ("github.com/AutoGPTQ/AutoGPTQ", "AutoGPTQ", 15),
            ("github.com/casper-hansen/AutoAWQ", "AutoAWQ", 15),
            ("github.com/turboderp/exllamav2", "ExLlamaV2", 15),
            ("github.com/Microsoft/DeepSpeed", "DeepSpeed", 15),

            # Privacy & Security
            ("github.com/huggingface/transformers", "Transformers Privacy", 20),
            ("github.com/opacus", "Differential Privacy", 15),
            ("fedml.ai", "Federated Learning", 15),

            # Financial Data & APIs for Training
            ("github.com/ranaroussi/yfinance", "Yahoo Finance Data", 15),
            ("github.com/alpha-vantage", "Alpha Vantage API", 10),
            ("github.com/tradytics", "Financial Data APIs", 15),

            # Model Deployment & Infrastructure
            ("github.com/ray-project/ray", "Ray Serve", 15),
            ("github.com/triton-inference-server", "Triton Inference", 15),
            ("github.com/bentoml/BentoML", "BentoML", 15),

            # Open Source Finance Tools with AI
            ("github.com/actualbudget/actual", "Actual Budget AI", 15),
            ("github.com/firefly-iii/firefly-iii", "Firefly III AI Integration", 15),
            ("github.com/maybe-finance/maybe", "Maybe Finance", 15),
        ]

        async with AsyncWebCrawler() as crawler:
            for domain, topic, max_pages in research_targets:
                if domain not in self.visited_domains:
                    self.visited_domains.add(domain)
                    results = await self.research_domain(crawler, domain, topic, max_pages)
                    self.research_results.extend(results)

                    # Categorize results
                    self.categorize_ai_results(results)

                    # Brief pause between domains
                    await asyncio.sleep(3)

        # Save research results
        self.save_research_results()
        self.generate_ai_research_summary()
        self.generate_model_comparison_matrix()

    def categorize_ai_results(self, results: List[Dict[str, Any]]):
        """Categorize AI research results by specific categories"""
        for result in results:
            content_lower = (result.get("content_preview", "") +
                           result.get("title", "") +
                           result.get("description", "")).lower()

            indicators = result.get("model_indicators", {})

            # Categorize based on content and indicators
            if "huggingface.co" in result.get("url", ""):
                self.research_data["huggingface_models"].append(result)

            if any(term in content_lower for term in ["ollama", "lm studio", "gpt4all", "localai", "llama.cpp", "vllm"]):
                self.research_data["local_inference_engines"].append(result)

            if indicators.get("is_financial_specific") or any(term in content_lower for term in ["finbert", "econbert", "financial ai", "finance llm"]):
                self.research_data["financial_specific_models"].append(result)

            if indicators.get("is_multimodal") or any(term in content_lower for term in ["multimodal", "vision", "document analysis"]):
                self.research_data["multimodal_models"].append(result)

            if any(term in content_lower for term in ["benchmark", "evaluation", "performance", "speed", "accuracy"]):
                self.research_data["performance_benchmarks"].append(result)

            if indicators.get("is_local_inference") or any(term in content_lower for term in ["privacy", "local", "offline", "on-device"]):
                self.research_data["privacy_first_options"].append(result)

            if any(term in content_lower for term in ["hybrid", "cloud", "edge", "api"]):
                self.research_data["hybrid_approaches"].append(result)

            if indicators.get("is_quantized") or any(term in content_lower for term in ["quantized", "gguf", "ggml", "4-bit", "8-bit"]):
                self.research_data["quantized_models"].append(result)

            if any(term in content_lower for term in ["fine-tuned", "fine tuning", "training", "dataset"]):
                self.research_data["fine_tuned_finance"].append(result)

            if any(term in content_lower for term in ["deployment", "setup", "installation", "guide", "tutorial"]):
                self.research_data["deployment_guides"].append(result)

    def save_research_results(self):
        """Save all AI research results to JSON files"""
        # Create research output directory
        output_dir = Path("/home/matt/Atlas-Financial/research/results/ai_models")
        output_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

        # Save raw results
        with open(output_dir / f"ai_models_raw_{timestamp}.json", "w") as f:
            json.dump(self.research_results, f, indent=2)

        # Save categorized results
        with open(output_dir / f"ai_models_categorized_{timestamp}.json", "w") as f:
            json.dump(self.research_data, f, indent=2)

        # Save model scores
        with open(output_dir / f"ai_models_scores_{timestamp}.json", "w") as f:
            json.dump(self.financial_model_scores, f, indent=2)

        print(f"\n💾 AI Models research results saved to {output_dir}")

    def generate_ai_research_summary(self):
        """Generate a summary of AI research findings"""
        print("\n📊 AI Models Research Summary")
        print("=" * 80)

        for category, items in self.research_data.items():
            if items:
                print(f"\n{category.replace('_', ' ').title()}: {len(items)} resources found")
                # Show top 5 by score
                top_items = sorted(items, key=lambda x: x.get("score", 0), reverse=True)[:5]
                for i, item in enumerate(top_items, 1):
                    title = item.get('title', 'No title')[:70]
                    score = item.get('score', 0)
                    indicators = item.get('model_indicators', {})

                    print(f"  {i}. {title}... (Score: {score:.2f})")
                    print(f"     URL: {item['url']}")

                    # Show model indicators if available
                    if indicators.get('model_size'):
                        print(f"     Size: {indicators['model_size']}")
                    if indicators.get('context_length'):
                        print(f"     Context: {indicators['context_length']}")
                    if indicators.get('is_financial_specific'):
                        print(f"     🎯 Financial-specific model")
                    if indicators.get('is_local_inference'):
                        print(f"     🔒 Privacy-first/Local inference")
                    if indicators.get('is_quantized'):
                        print(f"     ⚡ Quantized for efficiency")
                    print()

        print(f"\n📈 Total AI resources discovered: {len(self.research_results)}")
        print(f"🌐 Domains researched: {len(self.visited_domains)}")
        print(f"🏆 High-scoring models (>0.7): {len(self.financial_model_scores)}")

    def generate_model_comparison_matrix(self):
        """Generate a comparison matrix of the best models found"""
        print("\n🏆 Top Financial AI Models Comparison Matrix")
        print("=" * 80)

        # Get top models by score
        top_models = sorted(
            [item for item in self.research_results if item.get('score', 0) > 0.7],
            key=lambda x: x.get('score', 0),
            reverse=True
        )[:20]  # Top 20 models

        if not top_models:
            print("No high-scoring models found in this research session.")
            return

        print(f"{'Model/Resource':<50} {'Score':<8} {'Financial':<10} {'Local':<8} {'Size':<12} {'Privacy':<8}")
        print("-" * 100)

        for model in top_models:
            name = model.get('title', 'Unknown')[:48]
            score = f"{model.get('score', 0):.2f}"
            indicators = model.get('model_indicators', {})

            financial = "✓" if indicators.get('is_financial_specific') else "-"
            local = "✓" if indicators.get('is_local_inference') else "-"
            size = indicators.get('model_size', 'Unknown')[:10]
            privacy = "✓" if indicators.get('is_local_inference') else "-"

            print(f"{name:<50} {score:<8} {financial:<10} {local:<8} {size:<12} {privacy:<8}")

        # Generate recommendations
        self.generate_recommendations()

    def generate_recommendations(self):
        """Generate specific recommendations for Atlas Financial"""
        print("\n🎯 Recommendations for Atlas Financial AI CFO")
        print("=" * 80)

        # Analyze collected data for recommendations
        financial_models = [item for item in self.research_results
                          if item.get('model_indicators', {}).get('is_financial_specific')]
        local_models = [item for item in self.research_results
                       if item.get('model_indicators', {}).get('is_local_inference')]
        quantized_models = [item for item in self.research_results
                          if item.get('model_indicators', {}).get('is_quantized')]

        print(f"📋 Analysis Summary:")
        print(f"  - Financial-specific models found: {len(financial_models)}")
        print(f"  - Local inference options: {len(local_models)}")
        print(f"  - Quantized models available: {len(quantized_models)}")

        print(f"\n🏅 Top Recommendations:")

        # Get best financial-specific model
        if financial_models:
            best_financial = max(financial_models, key=lambda x: x.get('score', 0))
            print(f"  1. Best Financial Model: {best_financial.get('title', 'Unknown')}")
            print(f"     Score: {best_financial.get('score', 0):.2f}")
            print(f"     URL: {best_financial.get('url', '')}")

        # Get best local inference option
        if local_models:
            best_local = max(local_models, key=lambda x: x.get('score', 0))
            print(f"  2. Best Local Inference: {best_local.get('title', 'Unknown')}")
            print(f"     Score: {best_local.get('score', 0):.2f}")
            print(f"     URL: {best_local.get('url', '')}")

        # Get best quantized option
        if quantized_models:
            best_quantized = max(quantized_models, key=lambda x: x.get('score', 0))
            print(f"  3. Best Quantized Model: {best_quantized.get('title', 'Unknown')}")
            print(f"     Score: {best_quantized.get('score', 0):.2f}")
            print(f"     URL: {best_quantized.get('url', '')}")

        print(f"\n💡 Implementation Strategy:")
        print(f"  - Start with Ollama for easy local deployment")
        print(f"  - Test financial-specific models for accuracy")
        print(f"  - Use quantized versions for resource efficiency")
        print(f"  - Implement hybrid approach for complex tasks")


async def main():
    """Main AI models research execution"""
    researcher = FinancialAIModelsResearcher()
    await researcher.comprehensive_ai_models_research()


if __name__ == "__main__":
    asyncio.run(main())
