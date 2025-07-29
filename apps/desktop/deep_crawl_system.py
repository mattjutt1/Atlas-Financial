#!/usr/bin/env python3
"""
Comprehensive Deep Crawl System for Personal AI CFO Research
Built using official Crawl4ai documentation and best practices

This system provides advanced crawling capabilities for researching:
- Personal finance application architectures (2025)
- Desktop application frameworks and technologies
- AI integration for financial applications
- OAuth and bank integration solutions
- Security best practices for financial apps
- Open-source financial tools and libraries
- Cloud deployment strategies for personal apps
"""

import asyncio
import json
import time
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional, Union
from dataclasses import dataclass, asdict
import yaml

# Crawl4AI imports based on official documentation
try:
    from crawl4ai import AsyncWebCrawler
    from crawl4ai.async_configs import BrowserConfig, CrawlerRunConfig
    from crawl4ai.deep_crawling import (
        BFSDeepCrawlStrategy,
        DFSDeepCrawlStrategy,
        BestFirstCrawlingStrategy
    )
    from crawl4ai.content_scraping_strategy import LXMLWebScrapingStrategy
    from crawl4ai.cache_context import CacheMode
    from crawl4ai.extraction_strategy import (
        JsonCssExtractionStrategy,
        LLMExtractionStrategy
    )
    from crawl4ai.deep_crawling.filters import (
        FilterChain,
        DomainFilter,
        ContentRelevanceFilter,
        SEOFilter
    )
    from crawl4ai.deep_crawling.scorers import KeywordRelevanceScorer
    CRAWL4AI_AVAILABLE = True
except ImportError as e:
    print(f"Crawl4AI not available: {e}")
    print("Please install with: pip install crawl4ai")
    CRAWL4AI_AVAILABLE = False

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class CrawlTarget:
    """Research target configuration"""
    name: str
    base_urls: List[str]
    keywords: List[str]
    max_depth: int = 2
    max_pages: int = 50
    score_threshold: float = 0.4
    domain_restrictions: Optional[List[str]] = None
    description: str = ""

@dataclass
class ResearchConfig:
    """Deep crawl research configuration"""
    target: CrawlTarget
    strategy: str = "best_first"  # bfs, dfs, best_first
    use_streaming: bool = True
    enable_filters: bool = True
    extract_structured_data: bool = True
    save_raw_content: bool = False
    output_dir: str = "research_output"

class AdvancedDeepCrawler:
    """
    Advanced deep crawling system based on official Crawl4ai documentation
    Optimized for comprehensive research on Personal AI CFO technologies
    """

    def __init__(self, config_file: Optional[str] = None):
        self.browser_config = None
        self.crawler = None
        self.research_targets = []
        self.results_cache = {}

        # Initialize configuration
        if config_file and Path(config_file).exists():
            self.load_config(config_file)
        else:
            self.setup_default_config()

    def setup_default_config(self):
        """Setup default browser and crawler configuration"""
        # Browser configuration optimized for research crawling
        self.browser_config = BrowserConfig(
            browser_type="chromium",
            headless=True,  # Set to False for debugging
            viewport_width=1920,
            viewport_height=1080,
            verbose=True,
            text_mode=False,  # We want full content including images
            light_mode=False,  # Full features for comprehensive extraction
            user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            extra_args=[
                "--disable-blink-features=AutomationControlled",
                "--disable-dev-shm-usage",
                "--no-sandbox",
                "--disable-gpu"
            ]
        )

        # Define research targets for Personal AI CFO
        self.setup_research_targets()

    def setup_research_targets(self):
        """Define comprehensive research targets for Personal AI CFO development"""

        # 2025 Desktop Application Frameworks
        desktop_frameworks = CrawlTarget(
            name="desktop_frameworks_2025",
            base_urls=[
                "https://electronjs.org/",
                "https://tauri.app/",
                "https://docs.flutter.dev/desktop",
                "https://www.qt.io/",
                "https://avaloniaui.net/",
                "https://dotnet.microsoft.com/en-us/apps/desktop",
                "https://neutralino.js.org/",
                "https://github.com/wailsapp/wails",
                "https://kivy.org/",
                "https://flet.dev/"
            ],
            keywords=[
                "desktop application", "cross-platform", "native performance",
                "security", "distribution", "auto-update", "2025", "modern",
                "financial application", "data privacy", "offline capability"
            ],
            max_depth=3,
            max_pages=100,
            score_threshold=0.5,
            description="Research 2025 desktop application frameworks suitable for financial applications"
        )

        # AI Integration for Financial Applications
        ai_financial_integration = CrawlTarget(
            name="ai_financial_integration",
            base_urls=[
                "https://openai.com/api/",
                "https://docs.anthropic.com/",
                "https://huggingface.co/",
                "https://github.com/microsoft/semantic-kernel",
                "https://python.langchain.com/",
                "https://docs.llamaindex.ai/",
                "https://github.com/SciPhi-AI/R2R",
                "https://www.pinecone.io/",
                "https://weaviate.io/",
                "https://github.com/chroma-core/chroma"
            ],
            keywords=[
                "financial AI", "personal finance", "budgeting AI", "investment analysis",
                "natural language", "financial planning", "autonomous", "CFO",
                "financial data analysis", "machine learning finance", "AI agents"
            ],
            max_depth=2,
            max_pages=80,
            score_threshold=0.6,
            description="Research AI integration patterns for personal financial applications"
        )

        # Bank Integration and OAuth Solutions
        bank_integration = CrawlTarget(
            name="bank_integration_oauth",
            base_urls=[
                "https://plaid.com/docs/",
                "https://yodlee.com/",
                "https://finicity.com/",
                "https://www.tink.com/",
                "https://docs.openbankingplatform.com/",
                "https://github.com/TrueLayer/truelayer-dotnet",
                "https://nordigen.com/",
                "https://www.mx.com/",
                "https://www.akoya.com/",
                "https://github.com/plaid/quickstart"
            ],
            keywords=[
                "bank API", "open banking", "financial data", "account aggregation",
                "OAuth", "financial institutions", "transaction data", "balance",
                "secure connection", "PSD2", "financial services API"
            ],
            max_depth=2,
            max_pages=60,
            score_threshold=0.7,
            description="Research bank integration and OAuth solutions for personal finance"
        )

        # Financial Security Best Practices
        financial_security = CrawlTarget(
            name="financial_security_practices",
            base_urls=[
                "https://owasp.org/",
                "https://cheatsheetseries.owasp.org/",
                "https://github.com/OWASP/CheatSheetSeries",
                "https://www.nist.gov/cybersecurity",
                "https://csrc.nist.gov/",
                "https://www.iso.org/isoiec-27001-information-security.html",
                "https://www.pci-ssc.org/",
                "https://www.ffiec.gov/",
                "https://github.com/veracode/security-guides"
            ],
            keywords=[
                "financial application security", "data encryption", "secure storage",
                "authentication", "authorization", "PCI compliance", "data protection",
                "financial data security", "privacy", "GDPR", "CCPA", "encryption"
            ],
            max_depth=2,
            max_pages=70,
            score_threshold=0.8,
            description="Research security best practices for financial applications"
        )

        # Open Source Financial Tools
        opensource_finance = CrawlTarget(
            name="opensource_financial_tools",
            base_urls=[
                "https://github.com/topics/personal-finance",
                "https://github.com/topics/budgeting",
                "https://github.com/topics/financial-analysis",
                "https://github.com/topics/investment-tracking",
                "https://github.com/firefly-iii/firefly-iii",
                "https://github.com/actualbudget/actual",
                "https://github.com/maybe-finance/maybe",
                "https://github.com/envelope-zero/backend",
                "https://github.com/beancount/beancount",
                "https://github.com/ledger/ledger"
            ],
            keywords=[
                "personal finance", "budgeting", "expense tracking", "investment",
                "portfolio management", "financial planning", "accounting",
                "open source", "self-hosted", "privacy-focused"
            ],
            max_depth=2,
            max_pages=90,
            score_threshold=0.6,
            description="Research open-source financial tools and libraries"
        )

        # Cloud and Deployment Strategies
        cloud_deployment = CrawlTarget(
            name="cloud_deployment_strategies",
            base_urls=[
                "https://aws.amazon.com/financial-services/",
                "https://cloud.google.com/solutions/financial-services",
                "https://azure.microsoft.com/en-us/industries/financial/",
                "https://www.docker.com/",
                "https://kubernetes.io/",
                "https://docs.docker.com/",
                "https://helm.sh/",
                "https://github.com/features/actions",
                "https://supabase.com/",
                "https://firebase.google.com/"
            ],
            keywords=[
                "cloud deployment", "financial compliance", "data sovereignty",
                "hybrid cloud", "containerization", "CI/CD", "DevSecOps",
                "infrastructure as code", "scalability", "cost optimization"
            ],
            max_depth=2,
            max_pages=60,
            score_threshold=0.5,
            description="Research cloud deployment strategies for personal financial applications"
        )

        self.research_targets = [
            desktop_frameworks,
            ai_financial_integration,
            bank_integration,
            financial_security,
            opensource_finance,
            cloud_deployment
        ]

    def load_config(self, config_file: str):
        """Load configuration from YAML file"""
        with open(config_file, 'r') as f:
            config = yaml.safe_load(f)

        # Update browser config
        if 'browser' in config:
            self.browser_config = BrowserConfig(**config['browser'])

        # Update research targets
        if 'research_targets' in config:
            self.research_targets = []
            for target_config in config['research_targets']:
                target = CrawlTarget(**target_config)
                self.research_targets.append(target)

    def create_crawl_strategy(self, target: CrawlTarget, strategy_type: str = "best_first"):
        """Create deep crawl strategy based on target and type"""

        # Create keyword relevance scorer
        scorer = KeywordRelevanceScorer(
            keywords=target.keywords,
            weight=1.0
        )

        # Create filter chain
        filters = []

        # Domain filter if restrictions specified
        if target.domain_restrictions:
            domain_filter = DomainFilter(allowed_domains=target.domain_restrictions)
            filters.append(domain_filter)

        # Content relevance filter
        content_filter = ContentRelevanceFilter(
            query=" ".join(target.keywords[:5]),  # Use top 5 keywords
            threshold=0.3
        )
        filters.append(content_filter)

        # SEO filter for quality content
        seo_filter = SEOFilter(
            threshold=0.4,
            keywords=target.keywords[:10]  # Use top 10 keywords
        )
        filters.append(seo_filter)

        filter_chain = FilterChain(filters) if filters else None

        # Create strategy based on type
        if strategy_type == "bfs":
            return BFSDeepCrawlStrategy(
                max_depth=target.max_depth,
                include_external=target.domain_restrictions is None,
                url_scorer=scorer,
                max_pages=target.max_pages,
                score_threshold=target.score_threshold,
                filter_chain=filter_chain
            )
        elif strategy_type == "dfs":
            return DFSDeepCrawlStrategy(
                max_depth=target.max_depth,
                include_external=target.domain_restrictions is None,
                url_scorer=scorer,
                max_pages=target.max_pages,
                score_threshold=target.score_threshold,
                filter_chain=filter_chain
            )
        else:  # best_first
            return BestFirstCrawlingStrategy(
                max_depth=target.max_depth,
                include_external=target.domain_restrictions is None,
                url_scorer=scorer,
                max_pages=target.max_pages,
                filter_chain=filter_chain
            )

    def create_extraction_strategy(self, target: CrawlTarget):
        """Create extraction strategy for structured data"""

        # Define schema for financial/technical content extraction
        schema = {
            "name": f"{target.name}_extractor",
            "baseSelector": "body",
            "fields": [
                {
                    "name": "title",
                    "selector": "h1, h2, title",
                    "type": "text"
                },
                {
                    "name": "description",
                    "selector": "meta[name='description']",
                    "type": "attribute",
                    "attribute": "content"
                },
                {
                    "name": "main_content",
                    "selector": "main, article, .content, #content, .post-content",
                    "type": "text"
                },
                {
                    "name": "code_examples",
                    "selector": "pre, code, .highlight, .codehilite",
                    "type": "text"
                },
                {
                    "name": "links",
                    "selector": "a[href]",
                    "type": "attribute",
                    "attribute": "href"
                },
                {
                    "name": "technologies",
                    "selector": ".tag, .technology, .tech-stack, .badge",
                    "type": "text"
                }
            ]
        }

        return JsonCssExtractionStrategy(schema, verbose=True)

    async def crawl_target(self, target: CrawlTarget, research_config: ResearchConfig) -> Dict[str, Any]:
        """Crawl a specific research target"""
        logger.info(f"Starting crawl for target: {target.name}")
        logger.info(f"Description: {target.description}")
        logger.info(f"Base URLs: {target.base_urls}")

        results = {
            "target": target.name,
            "description": target.description,
            "timestamp": datetime.now().isoformat(),
            "crawl_results": [],
            "summary": {
                "total_pages": 0,
                "successful_pages": 0,
                "failed_pages": 0,
                "average_score": 0.0,
                "top_scoring_pages": []
            }
        }

        try:
            # Create crawl strategy
            strategy = self.create_crawl_strategy(target, research_config.strategy)

            # Create extraction strategy
            extraction_strategy = self.create_extraction_strategy(target)

            # Create crawler run config
            run_config = CrawlerRunConfig(
                deep_crawl_strategy=strategy,
                scraping_strategy=LXMLWebScrapingStrategy(),
                extraction_strategy=extraction_strategy if research_config.extract_structured_data else None,
                verbose=True,
                cache_mode=CacheMode.BYPASS,  # Always get fresh content for research
                stream=research_config.use_streaming,
                word_count_threshold=100,  # Lower threshold for technical content
                screenshot=False,  # Don't need screenshots for this research
                pdf=False,
                wait_for="networkidle"  # Wait for content to load
            )

            # Crawl each base URL
            all_results = []
            for base_url in target.base_urls:
                logger.info(f"Crawling base URL: {base_url}")
                try:
                    if research_config.use_streaming:
                        async for result in await self.crawler.arun(base_url, config=run_config):
                            all_results.append(result)
                            logger.info(f"Crawled: {result.url} (Status: {result.status_code})")
                    else:
                        crawl_results = await self.crawler.arun(base_url, config=run_config)
                        if isinstance(crawl_results, list):
                            all_results.extend(crawl_results)
                        else:
                            all_results.append(crawl_results)

                except Exception as e:
                    logger.error(f"Error crawling {base_url}: {e}")
                    continue

            # Process results
            successful_results = []
            failed_results = []
            scores = []

            for result in all_results:
                try:
                    if result.success and result.status_code == 200:
                        successful_results.append(result)
                        score = result.metadata.get('score', 0.0)
                        scores.append(score)

                        # Extract structured data if available
                        extracted_data = {}
                        if result.extracted_content:
                            try:
                                extracted_data = json.loads(result.extracted_content)
                            except:
                                extracted_data = {"raw": result.extracted_content}

                        page_result = {
                            "url": result.url,
                            "title": result.metadata.get('title', ''),
                            "score": score,
                            "depth": result.metadata.get('depth', 0),
                            "word_count": len(result.markdown.split()) if result.markdown else 0,
                            "extracted_data": extracted_data,
                            "timestamp": datetime.now().isoformat()
                        }

                        # Save raw content if requested
                        if research_config.save_raw_content:
                            page_result["markdown"] = result.markdown
                            page_result["html"] = result.html

                        results["crawl_results"].append(page_result)
                    else:
                        failed_results.append({
                            "url": result.url,
                            "status_code": result.status_code,
                            "error": result.metadata.get('error', 'Unknown error')
                        })
                except Exception as e:
                    logger.error(f"Error processing result for {result.url}: {e}")
                    failed_results.append({
                        "url": getattr(result, 'url', 'Unknown'),
                        "error": str(e)
                    })

            # Calculate summary statistics
            results["summary"]["total_pages"] = len(all_results)
            results["summary"]["successful_pages"] = len(successful_results)
            results["summary"]["failed_pages"] = len(failed_results)
            results["summary"]["average_score"] = sum(scores) / len(scores) if scores else 0.0

            # Get top scoring pages
            sorted_results = sorted(results["crawl_results"], key=lambda x: x["score"], reverse=True)
            results["summary"]["top_scoring_pages"] = sorted_results[:10]

            logger.info(f"Completed crawl for {target.name}: {len(successful_results)} successful pages")

        except Exception as e:
            logger.error(f"Critical error crawling target {target.name}: {e}")
            results["error"] = str(e)

        return results

    async def run_comprehensive_research(self, output_dir: str = "research_output"):
        """Run comprehensive research across all targets"""
        if not CRAWL4AI_AVAILABLE:
            logger.error("Crawl4AI is not available. Please install it first.")
            return

        logger.info("Starting comprehensive Personal AI CFO research")

        # Create output directory
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)

        # Initialize crawler
        async with AsyncWebCrawler(config=self.browser_config) as crawler:
            self.crawler = crawler

            all_research_results = {
                "research_session": {
                    "timestamp": datetime.now().isoformat(),
                    "total_targets": len(self.research_targets),
                    "description": "Comprehensive research for Personal AI CFO desktop application development"
                },
                "targets": {}
            }

            # Crawl each research target
            for target in self.research_targets:
                research_config = ResearchConfig(
                    target=target,
                    strategy="best_first",  # Use best-first for focused research
                    use_streaming=True,
                    enable_filters=True,
                    extract_structured_data=True,
                    save_raw_content=False,  # Set to True if you need full content
                    output_dir=output_dir
                )

                try:
                    target_results = await self.crawl_target(target, research_config)
                    all_research_results["targets"][target.name] = target_results

                    # Save individual target results
                    target_file = output_path / f"{target.name}_results.json"
                    with open(target_file, 'w') as f:
                        json.dump(target_results, f, indent=2)

                    logger.info(f"Saved results for {target.name} to {target_file}")

                except Exception as e:
                    logger.error(f"Failed to crawl target {target.name}: {e}")
                    all_research_results["targets"][target.name] = {
                        "error": str(e),
                        "timestamp": datetime.now().isoformat()
                    }

            # Save comprehensive results
            comprehensive_file = output_path / "comprehensive_research_results.json"
            with open(comprehensive_file, 'w') as f:
                json.dump(all_research_results, f, indent=2)

            logger.info(f"Comprehensive research completed. Results saved to {comprehensive_file}")

            # Generate summary report
            await self.generate_summary_report(all_research_results, output_path)

            return all_research_results

    async def generate_summary_report(self, research_results: Dict[str, Any], output_path: Path):
        """Generate a summary report of the research findings"""

        summary_content = []
        summary_content.append("# Personal AI CFO Research Summary Report")
        summary_content.append(f"\nGenerated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        summary_content.append(f"\nTotal Research Targets: {research_results['research_session']['total_targets']}")

        # Overall statistics
        total_pages = 0
        successful_pages = 0

        for target_name, target_data in research_results["targets"].items():
            if "summary" in target_data:
                total_pages += target_data["summary"]["total_pages"]
                successful_pages += target_data["summary"]["successful_pages"]

        summary_content.append(f"\nOverall Statistics:")
        summary_content.append(f"- Total pages crawled: {total_pages}")
        summary_content.append(f"- Successful pages: {successful_pages}")
        summary_content.append(f"- Success rate: {(successful_pages/total_pages*100):.1f}%" if total_pages > 0 else "- Success rate: N/A")

        # Target-specific summaries
        summary_content.append("\n## Research Target Summaries\n")

        for target_name, target_data in research_results["targets"].items():
            if "error" in target_data:
                summary_content.append(f"### {target_name}")
                summary_content.append(f"**Status:** Failed - {target_data['error']}\n")
                continue

            if "summary" not in target_data:
                continue

            summary = target_data["summary"]
            summary_content.append(f"### {target_name}")
            summary_content.append(f"**Description:** {target_data.get('description', 'N/A')}")
            summary_content.append(f"**Pages Crawled:** {summary['total_pages']}")
            summary_content.append(f"**Successful:** {summary['successful_pages']}")
            summary_content.append(f"**Average Score:** {summary['average_score']:.2f}")

            # Top findings
            if summary.get('top_scoring_pages'):
                summary_content.append("**Top Findings:**")
                for i, page in enumerate(summary['top_scoring_pages'][:5], 1):
                    summary_content.append(f"{i}. [{page.get('title', 'No title')}]({page['url']}) (Score: {page['score']:.2f})")

            summary_content.append("")

        # Save summary report
        summary_file = output_path / "research_summary.md"
        with open(summary_file, 'w') as f:
            f.write('\n'.join(summary_content))

        logger.info(f"Summary report saved to {summary_file}")

async def main():
    """Main function to run the deep crawl research system"""
    if not CRAWL4AI_AVAILABLE:
        print("❌ Crawl4AI is not available.")
        print("Please install it with: pip install crawl4ai")
        print("Then run: crawl4ai-setup")
        return

    print("🚀 Personal AI CFO Deep Research System")
    print("=" * 50)

    # Initialize the deep crawler
    crawler = AdvancedDeepCrawler()

    # Run comprehensive research
    try:
        results = await crawler.run_comprehensive_research("ai_cfo_research_output")
        print("✅ Research completed successfully!")
        print(f"📁 Results saved to: ai_cfo_research_output/")

        # Print summary statistics
        if results:
            total_targets = len(results["targets"])
            successful_targets = sum(1 for target_data in results["targets"].values() if "summary" in target_data)
            print(f"📊 Summary: {successful_targets}/{total_targets} targets completed successfully")

    except Exception as e:
        logger.error(f"Research failed: {e}")
        print(f"❌ Research failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
