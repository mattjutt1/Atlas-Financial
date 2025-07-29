#!/usr/bin/env python3
"""
Deep Crawl System for Personal AI CFO Research
Comprehensive web crawling system using Crawl4ai for researching personal finance applications
"""

import asyncio
import json
import os
import time
from datetime import datetime
from typing import List, Dict, Any, Optional, Set
from urllib.parse import urlparse, urljoin
import logging

# Crawl4ai imports
from crawl4ai import AsyncWebCrawler, CrawlerRunConfig, CacheMode
from crawl4ai.deep_crawling import (
    BFSDeepCrawlStrategy,
    BestFirstCrawlingStrategy,
    FilterChain
)
from crawl4ai.deep_crawling.filters import (
    URLPatternFilter,
    DomainFilter,
    ContentTypeFilter,
    SEOFilter,
    ContentRelevanceFilter
)
from crawl4ai.deep_crawling.scorers import (
    KeywordRelevanceScorer,
    CompositeScorer,
    ContentTypeScorer
)
from crawl4ai.extraction_strategy import JsonCssExtractionStrategy
from crawl4ai.web_scraping_strategy import LXMLWebScrapingStrategy

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FinancialAppDeepCrawler:
    """
    Advanced deep crawler specifically designed for researching personal finance applications,
    desktop frameworks, AI integration patterns, and security best practices.
    """

    def __init__(self, output_dir: str = "crawl_results"):
        self.output_dir = output_dir
        self.results_cache: Dict[str, List[Dict]] = {}
        self.crawl_stats = {
            "total_pages": 0,
            "successful_crawls": 0,
            "failed_crawls": 0,
            "domains_crawled": set(),
            "start_time": None,
            "end_time": None
        }

        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)

        # Define target research areas with specific keywords and patterns
        self.research_targets = {
            "desktop_frameworks": {
                "keywords": [
                    "electron", "tauri", "flutter desktop", "qt", "tkinter",
                    "javafx", "wpf", "avalonia", "maui", "gtk", "cross-platform desktop",
                    "desktop application framework", "native desktop", "web-to-desktop"
                ],
                "patterns": [
                    "*desktop*", "*electron*", "*tauri*", "*flutter*", "*qt*",
                    "*native*", "*cross-platform*", "*framework*"
                ],
                "domains": [
                    "electronjs.org", "tauri.app", "flutter.dev", "qt.io",
                    "microsoft.com", "docs.microsoft.com", "github.com",
                    "stackoverflow.com", "reddit.com"
                ]
            },
            "personal_finance_apps": {
                "keywords": [
                    "personal finance", "budget app", "expense tracking", "financial planning",
                    "money management", "spending tracker", "financial dashboard",
                    "personal accounting", "financial analytics", "wealth management",
                    "retirement planning", "investment tracking", "tax planning"
                ],
                "patterns": [
                    "*finance*", "*budget*", "*money*", "*expense*", "*financial*",
                    "*investment*", "*retirement*", "*wealth*", "*accounting*"
                ],
                "domains": [
                    "mint.com", "ynab.com", "quicken.com", "personalcapital.com",
                    "github.com", "awesome-selfhosted.net", "reddit.com",
                    "producthunt.com", "alternativeto.net"
                ]
            },
            "ai_integration": {
                "keywords": [
                    "AI integration", "machine learning", "artificial intelligence",
                    "openai api", "claude api", "gpt integration", "llm integration",
                    "ai financial advisor", "automated analysis", "smart categorization",
                    "predictive analytics", "financial ai", "robo advisor"
                ],
                "patterns": [
                    "*ai*", "*machine-learning*", "*openai*", "*gpt*", "*llm*",
                    "*artificial-intelligence*", "*automation*", "*smart*"
                ],
                "domains": [
                    "openai.com", "anthropic.com", "huggingface.co", "github.com",
                    "docs.openai.com", "cloud.google.com", "aws.amazon.com",
                    "azure.microsoft.com", "towardsdatascience.com"
                ]
            },
            "bank_integration": {
                "keywords": [
                    "bank api", "plaid", "yodlee", "open banking", "psd2",
                    "financial data aggregation", "bank connectivity", "oauth banking",
                    "fintech api", "account aggregation", "transaction sync",
                    "bank integration", "financial institution api"
                ],
                "patterns": [
                    "*plaid*", "*yodlee*", "*bank*", "*api*", "*oauth*",
                    "*fintech*", "*banking*", "*financial-data*"
                ],
                "domains": [
                    "plaid.com", "yodlee.com", "developer.mastercard.com",
                    "developers.visa.com", "github.com", "finicity.com",
                    "saltedge.com", "tink.com", "truelayer.com"
                ]
            },
            "security_practices": {
                "keywords": [
                    "financial data security", "encryption", "data privacy",
                    "secure storage", "pci compliance", "financial security",
                    "zero trust", "end-to-end encryption", "key management",
                    "secure authentication", "biometric security", "multi-factor"
                ],
                "patterns": [
                    "*security*", "*encryption*", "*privacy*", "*compliance*",
                    "*authentication*", "*zero-trust*", "*secure*"
                ],
                "domains": [
                    "owasp.org", "nist.gov", "security.org", "github.com",
                    "docs.microsoft.com", "cloud.google.com", "aws.amazon.com",
                    "cheatsheetseries.owasp.org"
                ]
            },
            "open_source_tools": {
                "keywords": [
                    "open source finance", "self-hosted", "financial tools",
                    "budget software", "accounting software", "expense tracker",
                    "financial dashboard", "portfolio tracker", "invoice software",
                    "tax software", "financial planning tools"
                ],
                "patterns": [
                    "*open-source*", "*self-hosted*", "*github*", "*finance*",
                    "*budget*", "*accounting*", "*financial*"
                ],
                "domains": [
                    "github.com", "gitlab.com", "awesome-selfhosted.net",
                    "reddit.com", "hackernews.ycombinator.com", "fossmint.com",
                    "alternativeto.net", "sourceforge.net"
                ]
            },
            "cloud_deployment": {
                "keywords": [
                    "cloud deployment", "docker", "kubernetes", "serverless",
                    "microservices", "cloud architecture", "scalability",
                    "devops", "ci/cd", "infrastructure as code",
                    "container orchestration", "cloud security"
                ],
                "patterns": [
                    "*cloud*", "*docker*", "*kubernetes*", "*serverless*",
                    "*microservices*", "*devops*", "*deployment*"
                ],
                "domains": [
                    "aws.amazon.com", "cloud.google.com", "azure.microsoft.com",
                    "docker.com", "kubernetes.io", "github.com",
                    "terraform.io", "ansible.com"
                ]
            }
        }

    def create_filter_chain(self, research_area: str) -> FilterChain:
        """Create optimized filter chain for specific research area."""
        target = self.research_targets[research_area]

        filters = [
            # Domain filtering - prioritize authoritative sources
            DomainFilter(
                allowed_domains=target["domains"] + [
                    "docs.python.org", "nodejs.org", "reactjs.org", "vuejs.org",
                    "developer.mozilla.org", "w3.org", "ietf.org"
                ],
                blocked_domains=[
                    "pinterest.com", "instagram.com", "facebook.com",
                    "twitter.com", "linkedin.com", "youtube.com", "tiktok.com"
                ]
            ),

            # URL pattern filtering
            URLPatternFilter(patterns=target["patterns"]),

            # Content type filtering - focus on web pages and documents
            ContentTypeFilter(
                allowed_types=[
                    "text/html", "application/xhtml+xml", "text/plain",
                    "application/pdf", "application/json"
                ]
            ),

            # SEO filtering for quality content
            SEOFilter(
                threshold=0.3,
                keywords=target["keywords"][:10]  # Use top 10 keywords
            )
        ]

        return FilterChain(filters)

    def create_url_scorer(self, research_area: str) -> CompositeScorer:
        """Create composite URL scorer for intelligent crawling."""
        target = self.research_targets[research_area]

        # Keyword relevance scorer
        keyword_scorer = KeywordRelevanceScorer(
            keywords=target["keywords"],
            weight=0.7
        )

        # Content type scorer - prioritize documentation and guides
        content_type_scorer = ContentTypeScorer(
            type_weights={
                '.html$': 1.0,
                '.pdf$': 0.9,
                '.md$': 0.8,
                '.json$': 0.6,
                '.txt$': 0.4
            },
            weight=0.3
        )

        return CompositeScorer([keyword_scorer, content_type_scorer])

    async def crawl_research_area(
        self,
        research_area: str,
        start_urls: List[str],
        max_depth: int = 2,
        max_pages: int = 100,
        streaming: bool = True
    ) -> List[Dict]:
        """
        Crawl a specific research area with optimized configuration.

        Args:
            research_area: Key from self.research_targets
            start_urls: List of starting URLs for the crawl
            max_depth: Maximum crawl depth
            max_pages: Maximum pages to crawl
            streaming: Whether to use streaming mode

        Returns:
            List of crawl results
        """
        logger.info(f"Starting crawl for research area: {research_area}")
        logger.info(f"Start URLs: {start_urls}")

        # Create filter chain and scorer
        filter_chain = self.create_filter_chain(research_area)
        url_scorer = self.create_url_scorer(research_area)

        # Configure deep crawl strategy
        deep_crawl_strategy = BestFirstCrawlingStrategy(
            max_depth=max_depth,
            max_pages=max_pages,
            url_scorer=url_scorer,
            filter_chain=filter_chain,
            include_external=True,  # Allow external links for comprehensive research
            score_threshold=0.2
        )

        # Configure crawler
        config = CrawlerRunConfig(
            deep_crawl_strategy=deep_crawl_strategy,
            scraping_strategy=LXMLWebScrapingStrategy(),
            cache_mode=CacheMode.BYPASS,  # Always get fresh content
            stream=streaming,
            verbose=True,
            # Additional options for better content extraction
            scan_full_page=True,
            word_count_threshold=50,
            process_iframes=False,
            remove_overlay_elements=True,
            # Performance optimizations
            page_timeout=30000,
            delay_before_return_html=1.0
        )

        results = []

        async with AsyncWebCrawler() as crawler:
            for start_url in start_urls:
                try:
                    if streaming:
                        async for result in await crawler.arun(start_url, config=config):
                            if result.success:
                                processed_result = self._process_result(result, research_area)
                                results.append(processed_result)
                                self.crawl_stats["successful_crawls"] += 1

                                # Log progress
                                score = result.metadata.get("score", 0)
                                logger.info(f"Crawled (Score: {score:.2f}): {result.url}")
                            else:
                                self.crawl_stats["failed_crawls"] += 1
                                logger.warning(f"Failed to crawl: {start_url}")

                    else:
                        crawl_results = await crawler.arun(start_url, config=config)
                        for result in crawl_results:
                            if result.success:
                                processed_result = self._process_result(result, research_area)
                                results.append(processed_result)
                                self.crawl_stats["successful_crawls"] += 1
                            else:
                                self.crawl_stats["failed_crawls"] += 1

                except Exception as e:
                    logger.error(f"Error crawling {start_url}: {str(e)}")
                    self.crawl_stats["failed_crawls"] += 1

        # Cache results
        self.results_cache[research_area] = results

        # Save results to file
        self._save_results(research_area, results)

        logger.info(f"Completed crawl for {research_area}: {len(results)} successful results")
        return results

    def _process_result(self, result, research_area: str) -> Dict:
        """Process and enrich crawl result with metadata."""
        domain = urlparse(result.url).netloc
        self.crawl_stats["domains_crawled"].add(domain)
        self.crawl_stats["total_pages"] += 1

        processed = {
            "url": result.url,
            "title": getattr(result, 'title', ''),
            "content": result.cleaned_html or result.html,
            "markdown": result.markdown,
            "text_length": len(result.cleaned_html or ''),
            "research_area": research_area,
            "domain": domain,
            "crawl_timestamp": datetime.now().isoformat(),
            "metadata": result.metadata or {},
            "links": result.links,
            "media": result.media,
            "success": result.success,
            "status_code": getattr(result, 'status_code', None),
            "score": result.metadata.get("score", 0) if result.metadata else 0
        }

        return processed

    def _save_results(self, research_area: str, results: List[Dict]):
        """Save crawl results to JSON file."""
        filename = f"{self.output_dir}/{research_area}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        with open(filename, 'w', encoding='utf-8') as f:
            json.dump({
                "research_area": research_area,
                "crawl_timestamp": datetime.now().isoformat(),
                "total_results": len(results),
                "results": results
            }, f, indent=2, ensure_ascii=False)

        logger.info(f"Saved {len(results)} results to {filename}")

    async def comprehensive_research_crawl(self):
        """
        Execute comprehensive research crawl across all target areas.
        This is the main method for conducting deep research.
        """
        self.crawl_stats["start_time"] = datetime.now()
        logger.info("Starting comprehensive research crawl for Personal AI CFO application")

        # Define starting URLs for each research area
        crawl_plans = {
            "desktop_frameworks": [
                "https://electronjs.org/docs",
                "https://tauri.app/v1/guides/",
                "https://flutter.dev/desktop",
                "https://github.com/topics/desktop-application",
                "https://github.com/topics/electron-app"
            ],
            "personal_finance_apps": [
                "https://github.com/topics/personal-finance",
                "https://github.com/topics/budget-tracker",
                "https://awesome-selfhosted.net/tags/money-budgeting-management.html",
                "https://www.reddit.com/r/personalfinance/wiki/tools/",
                "https://alternativeto.net/category/business-commerce/personal-finance/"
            ],
            "ai_integration": [
                "https://docs.openai.com/api",
                "https://docs.anthropic.com/claude/reference",
                "https://huggingface.co/docs",
                "https://github.com/topics/openai-api",
                "https://github.com/topics/ai-financial-analysis"
            ],
            "bank_integration": [
                "https://plaid.com/docs/",
                "https://developer.yodlee.com/",
                "https://github.com/topics/plaid",
                "https://github.com/topics/bank-api",
                "https://docs.tink.com/"
            ],
            "security_practices": [
                "https://owasp.org/www-project-top-ten/",
                "https://cheatsheetseries.owasp.org/",
                "https://csrc.nist.gov/publications/",
                "https://github.com/topics/financial-security",
                "https://github.com/topics/encryption"
            ],
            "open_source_tools": [
                "https://github.com/topics/finance",
                "https://github.com/topics/accounting",
                "https://awesome-selfhosted.net/",
                "https://github.com/topics/budget",
                "https://github.com/topics/expense-tracker"
            ],
            "cloud_deployment": [
                "https://docs.aws.amazon.com/",
                "https://cloud.google.com/docs",
                "https://docs.microsoft.com/en-us/azure/",
                "https://kubernetes.io/docs/",
                "https://docs.docker.com/"
            ]
        }

        all_results = {}

        # Crawl each research area
        for area, start_urls in crawl_plans.items():
            try:
                logger.info(f"\n{'='*60}")
                logger.info(f"CRAWLING: {area.upper()}")
                logger.info(f"{'='*60}")

                results = await self.crawl_research_area(
                    research_area=area,
                    start_urls=start_urls,
                    max_depth=3,  # Go deeper for comprehensive research
                    max_pages=150,  # More pages for thorough coverage
                    streaming=True
                )

                all_results[area] = results

                # Brief pause between research areas
                await asyncio.sleep(2)

            except Exception as e:
                logger.error(f"Error in {area} crawl: {str(e)}")
                all_results[area] = []

        self.crawl_stats["end_time"] = datetime.now()

        # Generate comprehensive summary
        self._generate_comprehensive_summary(all_results)

        return all_results

    def _generate_comprehensive_summary(self, all_results: Dict[str, List[Dict]]):
        """Generate comprehensive summary of all crawl results."""
        total_duration = self.crawl_stats["end_time"] - self.crawl_stats["start_time"]

        summary = {
            "crawl_summary": {
                "total_duration_minutes": total_duration.total_seconds() / 60,
                "total_pages_crawled": self.crawl_stats["total_pages"],
                "successful_crawls": self.crawl_stats["successful_crawls"],
                "failed_crawls": self.crawl_stats["failed_crawls"],
                "success_rate": self.crawl_stats["successful_crawls"] / max(1, self.crawl_stats["total_pages"]),
                "domains_crawled": list(self.crawl_stats["domains_crawled"]),
                "unique_domains": len(self.crawl_stats["domains_crawled"])
            },
            "research_areas": {}
        }

        # Analyze each research area
        for area, results in all_results.items():
            if results:
                area_summary = {
                    "total_pages": len(results),
                    "average_score": sum(r.get("score", 0) for r in results) / len(results),
                    "top_domains": self._get_top_domains(results),
                    "content_stats": {
                        "total_text_length": sum(r.get("text_length", 0) for r in results),
                        "average_text_length": sum(r.get("text_length", 0) for r in results) / len(results)
                    },
                    "high_value_pages": [
                        {"url": r["url"], "score": r.get("score", 0), "title": r.get("title", "")}
                        for r in sorted(results, key=lambda x: x.get("score", 0), reverse=True)[:10]
                    ]
                }
                summary["research_areas"][area] = area_summary

        # Save summary
        summary_file = f"{self.output_dir}/comprehensive_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)

        logger.info(f"\n{'='*80}")
        logger.info("COMPREHENSIVE CRAWL SUMMARY")
        logger.info(f"{'='*80}")
        logger.info(f"Duration: {summary['crawl_summary']['total_duration_minutes']:.1f} minutes")
        logger.info(f"Total pages: {summary['crawl_summary']['total_pages_crawled']}")
        logger.info(f"Success rate: {summary['crawl_summary']['success_rate']:.1%}")
        logger.info(f"Unique domains: {summary['crawl_summary']['unique_domains']}")
        logger.info(f"Summary saved to: {summary_file}")

    def _get_top_domains(self, results: List[Dict], top_n: int = 5) -> List[Dict]:
        """Get top domains by page count and average score."""
        domain_stats = {}

        for result in results:
            domain = result.get("domain", "unknown")
            if domain not in domain_stats:
                domain_stats[domain] = {"count": 0, "total_score": 0}

            domain_stats[domain]["count"] += 1
            domain_stats[domain]["total_score"] += result.get("score", 0)

        # Calculate averages and sort
        for domain, stats in domain_stats.items():
            stats["average_score"] = stats["total_score"] / stats["count"]

        return sorted(
            [{"domain": domain, **stats} for domain, stats in domain_stats.items()],
            key=lambda x: (x["count"], x["average_score"]),
            reverse=True
        )[:top_n]

    def get_research_insights(self, research_area: str) -> Dict:
        """
        Extract key insights from crawled data for a specific research area.
        """
        if research_area not in self.results_cache:
            logger.warning(f"No cached results for {research_area}")
            return {}

        results = self.results_cache[research_area]
        if not results:
            return {}

        # Extract top-scoring pages
        top_pages = sorted(results, key=lambda x: x.get("score", 0), reverse=True)[:20]

        # Extract most common domains
        domain_counts = {}
        for result in results:
            domain = result.get("domain", "unknown")
            domain_counts[domain] = domain_counts.get(domain, 0) + 1

        insights = {
            "total_pages": len(results),
            "top_scoring_pages": [
                {
                    "url": page["url"],
                    "title": page.get("title", ""),
                    "score": page.get("score", 0),
                    "domain": page.get("domain", "")
                }
                for page in top_pages
            ],
            "domain_distribution": sorted(
                domain_counts.items(),
                key=lambda x: x[1],
                reverse=True
            )[:10],
            "content_analysis": {
                "total_content_length": sum(r.get("text_length", 0) for r in results),
                "average_content_length": sum(r.get("text_length", 0) for r in results) / len(results),
                "pages_with_substantial_content": len([r for r in results if r.get("text_length", 0) > 1000])
            }
        }

        return insights


async def main():
    """Main execution function for the deep crawler."""
    print("🚀 Personal AI CFO Deep Research Crawler")
    print("=" * 60)

    # Initialize crawler
    crawler = FinancialAppDeepCrawler(output_dir="ai_cfo_research")

    # Execute comprehensive research
    results = await crawler.comprehensive_research_crawl()

    print("\n🎯 Research Areas Completed:")
    for area, area_results in results.items():
        print(f"  • {area}: {len(area_results)} pages")

        # Get insights for each area
        insights = crawler.get_research_insights(area)
        if insights:
            print(f"    - Top domains: {[d[0] for d in insights['domain_distribution'][:3]]}")
            print(f"    - Avg content length: {insights['content_analysis']['average_content_length']:.0f} chars")

    print(f"\n✅ All results saved to: {crawler.output_dir}/")
    print("🔍 Ready for analysis and planning phase!")

if __name__ == "__main__":
    asyncio.run(main())
