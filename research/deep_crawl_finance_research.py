#!/usr/bin/env python3
"""
Atlas Financial - Deep Crawl Research System
Uses Crawl4AI to comprehensively research 2025 personal finance technologies
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


class PersonalFinanceResearchCrawler:
    """Deep crawl system for researching personal finance application technologies"""

    def __init__(self):
        self.research_data = {
            "desktop_frameworks": [],
            "ai_integration": [],
            "oauth_solutions": [],
            "security_practices": [],
            "cloud_architectures": [],
            "open_source_tools": [],
            "financial_apis": [],
            "accounting_systems": [],
            "investment_tools": [],
            "retirement_planning": []
        }

        self.visited_domains = set()
        self.research_results = []

    def create_finance_filter_chain(self, allowed_domains: List[str]) -> FilterChain:
        """Create comprehensive filter chain for finance research"""
        return FilterChain([
            # Domain filtering
            DomainFilter(
                allowed_domains=allowed_domains,
                blocked_domains=[
                    "facebook.com", "twitter.com", "linkedin.com",
                    "youtube.com", "instagram.com", "tiktok.com"
                ]
            ),

            # URL pattern filtering for relevant content
            URLPatternFilter(patterns=[
                "*finance*", "*fintech*", "*banking*", "*accounting*",
                "*investment*", "*budgeting*", "*desktop*", "*electron*",
                "*tauri*", "*rust*", "*ai*", "*llm*", "*oauth*",
                "*security*", "*encryption*", "*2025*", "*guide*",
                "*tutorial*", "*documentation*", "*api*", "*integration*"
            ]),

            # Content type filtering
            ContentTypeFilter(allowed_types=["text/html"]),

            # Content relevance filtering
            ContentRelevanceFilter(
                query="personal finance desktop application AI budgeting CPA accounting investment retirement 2025",
                threshold=0.5
            )
        ])

    def create_finance_scorer(self) -> KeywordRelevanceScorer:
        """Create keyword scorer for finance-related content"""
        return KeywordRelevanceScorer(
            keywords=[
                # Core finance terms
                "personal finance", "budgeting", "accounting", "investment",
                "retirement planning", "financial planning", "expense tracking",

                # Technology terms
                "desktop application", "electron", "tauri", "rust", "2025",
                "modern", "secure", "open source", "privacy", "local first",

                # AI/ML terms
                "artificial intelligence", "machine learning", "llm", "ollama",
                "local ai", "financial analysis", "predictive", "insights",

                # Integration terms
                "oauth", "bank integration", "plaid", "simplefin", "api",
                "autonomous", "sync", "real-time", "automated",

                # Security terms
                "encryption", "security", "privacy", "bank-grade", "compliance",
                "data protection", "zero knowledge", "end-to-end",

                # Business terms
                "cpa", "double-entry", "bookkeeping", "business finance",
                "real estate", "tax", "deductions", "reporting"
            ],
            weight=0.8
        )

    async def research_domain(self, crawler: AsyncWebCrawler, domain: str, topic: str, max_pages: int = 20):
        """Research a specific domain for finance-related content"""
        print(f"\n🔍 Researching {topic} on {domain}...")

        # Create targeted filter and scorer
        filter_chain = self.create_finance_filter_chain([domain])
        scorer = self.create_finance_scorer()

        # Configure deep crawl strategy
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

                    # Extract relevant information
                    research_item = {
                        "url": result.url,
                        "topic": topic,
                        "domain": domain,
                        "score": score,
                        "depth": depth,
                        "title": result.metadata.get("title", ""),
                        "description": result.metadata.get("description", ""),
                        "content_preview": result.markdown.raw_markdown[:500] if result.markdown else "",
                        "timestamp": datetime.now().isoformat()
                    }

                    results.append(research_item)
                    print(f"  ✓ Found: {result.url} (Score: {score:.2f}, Depth: {depth})")

        except Exception as e:
            print(f"  ❌ Error researching {domain}: {str(e)}")

        return results

    async def comprehensive_finance_research(self):
        """Conduct comprehensive research on personal finance technologies"""
        print("🚀 Starting Comprehensive Personal Finance Technology Research for 2025")
        print("=" * 70)

        # Define research targets
        research_targets = [
            # Desktop frameworks
            ("tauri.app", "Desktop Frameworks - Tauri", 15),
            ("www.electronjs.org", "Desktop Frameworks - Electron", 10),
            ("github.com/tauri-apps", "Tauri Examples & Projects", 20),

            # AI/LLM integration
            ("ollama.ai", "Local AI - Ollama", 15),
            ("huggingface.co", "AI Models for Finance", 10),
            ("github.com/ggerganov/llama.cpp", "Local LLM Solutions", 10),

            # Financial APIs and OAuth
            ("plaid.com/docs", "Bank Integration - Plaid", 15),
            ("simplefin.org", "SimpleFIN Integration", 10),
            ("github.com/openbanking", "Open Banking APIs", 15),

            # Security practices
            ("owasp.org", "Security Best Practices", 10),
            ("cheatsheetseries.owasp.org", "Security Cheat Sheets", 15),

            # Open source finance tools
            ("github.com/actualbudget", "Actual Budget", 15),
            ("github.com/firefly-iii", "Firefly III", 15),
            ("github.com/cioraneanu/firefly-pico", "Firefly Pico", 10),

            # Cloud architectures
            ("supabase.com/docs", "Supabase for Finance Apps", 15),
            ("railway.app/docs", "Railway Deployment", 10),
            ("render.com/docs", "Render Deployment", 10),

            # Accounting systems
            ("www.gnucash.org", "GnuCash - Open Source Accounting", 10),
            ("github.com/Gnucash", "GnuCash Development", 10),

            # Investment tools
            ("github.com/ranaroussi/yfinance", "Yahoo Finance API", 10),
            ("www.alpaca.markets/docs", "Alpaca Trading API", 10),

            # Personal finance blogs/resources
            ("www.bogleheads.org", "Investment Philosophy", 5),
            ("www.reddit.com/r/personalfinance", "Community Insights", 5)
        ]

        async with AsyncWebCrawler() as crawler:
            for domain, topic, max_pages in research_targets:
                if domain not in self.visited_domains:
                    self.visited_domains.add(domain)
                    results = await self.research_domain(crawler, domain, topic, max_pages)
                    self.research_results.extend(results)

                    # Categorize results
                    self.categorize_results(results)

                    # Brief pause between domains
                    await asyncio.sleep(2)

        # Save research results
        self.save_research_results()
        self.generate_research_summary()

    def categorize_results(self, results: List[Dict[str, Any]]):
        """Categorize research results by topic"""
        for result in results:
            content_lower = (result.get("content_preview", "") +
                           result.get("title", "") +
                           result.get("description", "")).lower()

            # Categorize based on content
            if any(term in content_lower for term in ["tauri", "electron", "desktop app", "native app"]):
                self.research_data["desktop_frameworks"].append(result)

            if any(term in content_lower for term in ["ai", "llm", "machine learning", "ollama", "gpt", "claude"]):
                self.research_data["ai_integration"].append(result)

            if any(term in content_lower for term in ["oauth", "plaid", "simplefin", "bank api", "open banking"]):
                self.research_data["oauth_solutions"].append(result)

            if any(term in content_lower for term in ["security", "encryption", "authentication", "privacy"]):
                self.research_data["security_practices"].append(result)

            if any(term in content_lower for term in ["cloud", "deploy", "hosting", "serverless", "docker"]):
                self.research_data["cloud_architectures"].append(result)

            if any(term in content_lower for term in ["open source", "oss", "free software", "github"]):
                self.research_data["open_source_tools"].append(result)

            if any(term in content_lower for term in ["api", "rest", "graphql", "integration"]):
                self.research_data["financial_apis"].append(result)

            if any(term in content_lower for term in ["accounting", "bookkeeping", "double-entry", "cpa"]):
                self.research_data["accounting_systems"].append(result)

            if any(term in content_lower for term in ["investment", "portfolio", "stocks", "etf", "retirement"]):
                self.research_data["investment_tools"].append(result)

    def save_research_results(self):
        """Save all research results to JSON files"""
        # Create research output directory
        output_dir = Path("/home/matt/Atlas-Financial/research/results")
        output_dir.mkdir(parents=True, exist_ok=True)

        # Save raw results
        with open(output_dir / f"raw_research_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json", "w") as f:
            json.dump(self.research_results, f, indent=2)

        # Save categorized results
        with open(output_dir / f"categorized_research_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json", "w") as f:
            json.dump(self.research_data, f, indent=2)

        print(f"\n💾 Research results saved to {output_dir}")

    def generate_research_summary(self):
        """Generate a summary of research findings"""
        print("\n📊 Research Summary")
        print("=" * 70)

        for category, items in self.research_data.items():
            if items:
                print(f"\n{category.replace('_', ' ').title()}: {len(items)} resources found")
                # Show top 3 by score
                top_items = sorted(items, key=lambda x: x.get("score", 0), reverse=True)[:3]
                for item in top_items:
                    print(f"  - {item['title'][:60]}... (Score: {item['score']:.2f})")
                    print(f"    {item['url']}")

        print(f"\n📈 Total resources discovered: {len(self.research_results)}")
        print(f"🌐 Domains researched: {len(self.visited_domains)}")


async def main():
    """Main research execution"""
    crawler = PersonalFinanceResearchCrawler()
    await crawler.comprehensive_finance_research()


if __name__ == "__main__":
    asyncio.run(main())
