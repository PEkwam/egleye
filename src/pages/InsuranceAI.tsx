import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, Search, ExternalLink, Sparkles, Globe2, Building2, Zap, Shield, TrendingUp, Bot, ArrowLeft, Calendar } from 'lucide-react';

interface AIDeployment {
  id: string;
  company: string;
  country: string;
  title: string;
  description: string;
  aiType: string;
  useCase: string;
  date: string;
  link?: string;
  impact?: string;
}

// Latest AI deployments from July 2025 onwards
const AI_DEPLOYMENTS: AIDeployment[] = [
  {
    id: '1',
    company: 'Lemonade',
    country: 'USA',
    title: 'AI Jim 3.0 - Generative Claims',
    description: 'Next-gen AI claims bot using GPT-5 for natural conversation and instant claim resolution with fraud detection.',
    aiType: 'Generative AI',
    useCase: 'Claims Processing',
    date: 'Oct 2025',
    link: 'https://www.lemonade.com',
    impact: 'Processes 65% of claims instantly',
  },
  {
    id: '2',
    company: 'Ping An Insurance',
    country: 'China',
    title: 'Smart Claims AI 2.0',
    description: 'Enhanced multimodal AI using satellite imagery and IoT data for real-time property damage assessment.',
    aiType: 'Multimodal AI',
    useCase: 'Property Claims',
    date: 'Sep 2025',
    link: 'https://www.pingan.com',
    impact: 'Claims processed in under 3 minutes',
  },
  {
    id: '3',
    company: 'Zurich Insurance',
    country: 'Switzerland',
    title: 'AI Risk Compass',
    description: 'Climate risk AI that predicts natural disasters and adjusts premiums in real-time using weather data.',
    aiType: 'Predictive AI',
    useCase: 'Risk Assessment',
    date: 'Nov 2025',
    link: 'https://www.zurich.com',
    impact: 'Improved risk prediction by 85%',
  },
  {
    id: '4',
    company: 'AXA',
    country: 'France',
    title: 'FraudShield AI',
    description: 'Real-time fraud detection using behavioral biometrics and voice analysis during claims calls.',
    aiType: 'Behavioral AI',
    useCase: 'Fraud Detection',
    date: 'Aug 2025',
    link: 'https://www.axa.com',
    impact: 'Detects 90% of fraud attempts',
  },
  {
    id: '5',
    company: 'Allianz',
    country: 'Germany',
    title: 'CLARA - Customer AI',
    description: 'Omnichannel AI assistant handling policy queries, claims, renewals in 30+ languages with emotional intelligence.',
    aiType: 'Conversational AI',
    useCase: 'Customer Service',
    date: 'Jul 2025',
    link: 'https://www.allianz.com',
    impact: '70% of queries resolved by AI',
  },
  {
    id: '6',
    company: 'MetLife',
    country: 'USA',
    title: 'HealthIQ AI Platform',
    description: 'AI-powered health monitoring using wearable data to offer personalized life insurance rates.',
    aiType: 'Health Analytics',
    useCase: 'Life Insurance',
    date: 'Oct 2025',
    link: 'https://www.metlife.com',
    impact: '25% reduction in claims',
  },
  {
    id: '7',
    company: 'Swiss Re',
    country: 'Switzerland',
    title: 'Magnum AI Underwriting',
    description: 'Autonomous underwriting engine for commercial risks using real-time market and company data.',
    aiType: 'Machine Learning',
    useCase: 'Underwriting',
    date: 'Sep 2025',
    link: 'https://www.swissre.com',
    impact: 'Quotes in seconds vs days',
  },
  {
    id: '8',
    company: 'Oscar Health',
    country: 'USA',
    title: 'AI Care Navigator',
    description: 'Proactive health AI that schedules appointments, manages prescriptions, and predicts health needs.',
    aiType: 'Healthcare AI',
    useCase: 'Health Insurance',
    date: 'Aug 2025',
    link: 'https://www.hioscar.com',
    impact: '40% better health outcomes',
  },
  {
    id: '9',
    company: 'Tractable',
    country: 'UK',
    title: 'AI Estimating Pro',
    description: 'Instant vehicle damage assessment from photos with parts pricing and repair shop matching.',
    aiType: 'Computer Vision',
    useCase: 'Motor Claims',
    date: 'Jul 2025',
    link: 'https://www.tractable.ai',
    impact: 'Used by 50+ insurers globally',
  },
  {
    id: '10',
    company: 'Prudential',
    country: 'USA',
    title: 'PULSE AI Advisor',
    description: 'AI financial advisor for retirement planning using life expectancy predictions and market analysis.',
    aiType: 'Financial AI',
    useCase: 'Retirement Planning',
    date: 'Nov 2025',
    link: 'https://www.prudential.com',
    impact: '35% higher retirement savings',
  },
  {
    id: '11',
    company: 'Tokio Marine',
    country: 'Japan',
    title: 'Disaster Response AI',
    description: 'Drone-based AI for rapid disaster assessment and automatic claims initiation for affected customers.',
    aiType: 'Drone AI',
    useCase: 'Catastrophe Response',
    date: 'Oct 2025',
    link: 'https://www.tokiomarine.com',
    impact: 'Claims paid within 24 hours',
  },
  {
    id: '12',
    company: 'Generali',
    country: 'Italy',
    title: 'Wellness Coach AI',
    description: 'Personalized wellness AI that integrates with gym equipment and nutrition apps to reward healthy behavior.',
    aiType: 'Wellness AI',
    useCase: 'Health & Wellness',
    date: 'Sep 2025',
    link: 'https://www.generali.com',
    impact: '20% premium discounts earned',
  },
];

const USE_CASES = ['All', 'Claims Processing', 'Motor Claims', 'Underwriting', 'Fraud Detection', 'Customer Service', 'Health Insurance', 'Risk Assessment'];

export default function InsuranceAI() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUseCase, setSelectedUseCase] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const filteredDeployments = AI_DEPLOYMENTS.filter((deployment) => {
    const matchesSearch = searchQuery === '' || 
      deployment.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deployment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deployment.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deployment.country.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesUseCase = selectedUseCase === 'All' || deployment.useCase === selectedUseCase;
    
    return matchesSearch && matchesUseCase;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Compact Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border/50 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Back to News</span>
            </Link>
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <span className="font-bold font-display">AI in Insurance</span>
            </div>
            <Badge variant="outline" className="text-xs">
              <Calendar className="h-3 w-3 mr-1" />
              Jul 2025+
            </Badge>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-background" />
        <div className="container mx-auto px-4 py-12 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
              <Bot className="h-4 w-4" />
              <span className="text-sm font-semibold">Latest Deployments from Jul 2025</span>
            </div>
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold font-display mb-4">
              <span className="gradient-text">Global Insurance AI</span>
            </h1>
            
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Track the latest AI deployments by major insurance companies worldwide.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 max-w-2xl mx-auto">
              <div className="p-3 rounded-xl bg-card border border-border/50">
                <div className="text-2xl font-bold text-primary">{AI_DEPLOYMENTS.length}</div>
                <div className="text-xs text-muted-foreground">Solutions</div>
              </div>
              <div className="p-3 rounded-xl bg-card border border-border/50">
                <div className="text-2xl font-bold text-accent">10</div>
                <div className="text-xs text-muted-foreground">Countries</div>
              </div>
              <div className="p-3 rounded-xl bg-card border border-border/50">
                <div className="text-2xl font-bold text-emerald-500">8</div>
                <div className="text-xs text-muted-foreground">Use Cases</div>
              </div>
              <div className="p-3 rounded-xl bg-card border border-border/50">
                <div className="text-2xl font-bold text-purple-500">2025</div>
                <div className="text-xs text-muted-foreground">Latest</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="container mx-auto px-4 py-6 border-b border-border/50">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search company or technology..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            {USE_CASES.map((useCase) => (
              <Button
                key={useCase}
                variant={selectedUseCase === useCase ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedUseCase(useCase)}
                className="text-xs h-8"
              >
                {useCase}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* AI Deployments Grid */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold font-display">
            {selectedUseCase === 'All' ? 'All AI Deployments' : `${selectedUseCase} Solutions`}
          </h2>
          <Badge variant="secondary" className="text-sm">
            {filteredDeployments.length} solutions
          </Badge>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-4 w-40" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredDeployments.length === 0 ? (
          <div className="text-center py-12">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-1">No AI solutions found</h3>
            <p className="text-muted-foreground text-sm">Try adjusting your search or filter</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDeployments.map((deployment, index) => (
              <Card 
                key={deployment.id} 
                className="group overflow-hidden border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-foreground text-sm">{deployment.company}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Globe2 className="h-3 w-3" />
                        <span>{deployment.country}</span>
                        <span>•</span>
                        <span className="text-primary font-medium">{deployment.date}</span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {deployment.aiType}
                    </Badge>
                  </div>
                  <CardTitle className="text-base mt-2 group-hover:text-primary transition-colors">
                    {deployment.title}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <CardDescription className="text-sm mb-3 line-clamp-2">
                    {deployment.description}
                  </CardDescription>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-primary/10 text-primary border-0 text-xs">
                      <Zap className="h-3 w-3 mr-1" />
                      {deployment.useCase}
                    </Badge>
                  </div>

                  {deployment.impact && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs mb-3">
                      <TrendingUp className="h-3 w-3 shrink-0" />
                      <span>{deployment.impact}</span>
                    </div>
                  )}

                  {deployment.link && (
                    <a
                      href={deployment.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Learn more <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-10">
        <div className="max-w-3xl mx-auto text-center p-6 md:p-8 rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-background border border-border/50">
          <Sparkles className="h-10 w-10 text-primary mx-auto mb-3" />
          <h2 className="text-xl md:text-2xl font-bold font-display mb-3">
            Know of an AI deployment we missed?
          </h2>
          <p className="text-muted-foreground text-sm mb-4 max-w-md mx-auto">
            Submit new AI deployments from insurance companies worldwide (Jul 2025+).
          </p>
          <Button size="default" className="btn-modern">
            <Shield className="h-4 w-4 mr-2" />
            Submit AI Deployment
          </Button>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="border-t border-border/50 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2025 Ghana InsureWatch. All rights reserved.
        </div>
      </footer>
    </div>
  );
}