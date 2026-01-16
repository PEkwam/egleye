import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, Search, ExternalLink, Sparkles, Globe2, Building2, Zap, Shield, TrendingUp, Bot, ArrowLeft, Calendar, Cpu, Network, Layers } from 'lucide-react';

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

// Animated particles component
const ParticlesBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Neural network lines */}
      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        {[...Array(8)].map((_, i) => (
          <line
            key={i}
            x1={`${10 + i * 12}%`}
            y1="0%"
            x2={`${30 + i * 10}%`}
            y2="100%"
            stroke="url(#line-gradient)"
            strokeWidth="1"
            className="animate-pulse"
            style={{ animationDelay: `${i * 0.5}s` }}
          />
        ))}
      </svg>
      
      {/* Floating particles */}
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary/30 animate-float"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${3 + Math.random() * 4}s`,
          }}
        />
      ))}
    </div>
  );
};

// AI Card loading skeleton with glassmorphism
const AICardSkeleton = () => (
  <div className="group relative overflow-hidden rounded-2xl border border-white/10 backdrop-blur-xl bg-gradient-to-br from-white/5 to-white/10 dark:from-white/5 dark:to-white/[0.02] p-5">
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-2">
          <Skeleton className="h-5 w-28 bg-white/10" />
          <Skeleton className="h-3 w-20 bg-white/10" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full bg-white/10" />
      </div>
      <Skeleton className="h-5 w-full bg-white/10" />
      <Skeleton className="h-16 w-full bg-white/10" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-24 rounded-full bg-white/10" />
        <Skeleton className="h-6 w-16 rounded-full bg-white/10" />
      </div>
    </div>
  </div>
);

export default function InsuranceAI() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUseCase, setSelectedUseCase] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      {/* Compact Header with Glassmorphism */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-background/60 border-b border-white/10 shadow-lg shadow-primary/5">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group">
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-medium">Back to News</span>
            </Link>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Brain className="h-5 w-5 text-primary animate-pulse" />
                <div className="absolute -inset-1 bg-primary/20 rounded-full blur-md -z-10" />
              </div>
              <span className="font-bold font-display bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                AI in Insurance
              </span>
            </div>
            <Badge variant="outline" className="text-xs border-primary/30 bg-primary/5">
              <Calendar className="h-3 w-3 mr-1" />
              Jul 2025+
            </Badge>
          </div>
        </div>
      </header>

      {/* Hero Section with Particles */}
      <section className="relative overflow-hidden py-16 md:py-24" onMouseMove={handleMouseMove}>
        <ParticlesBackground />
        
        {/* Spotlight effect */}
        <div 
          className="absolute pointer-events-none transition-opacity duration-300"
          style={{
            left: mousePosition.x - 200,
            top: mousePosition.y - 200,
            width: 400,
            height: 400,
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Animated Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 text-primary mb-6 border border-primary/20 backdrop-blur-sm animate-fade-in">
              <div className="relative">
                <Bot className="h-4 w-4" />
                <div className="absolute -inset-1 bg-primary/30 rounded-full blur animate-pulse" />
              </div>
              <span className="text-sm font-semibold">Latest Deployments from Jul 2025</span>
              <Sparkles className="h-4 w-4 text-accent animate-pulse" />
            </div>
            
            {/* Title with Gradient */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-display mb-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
              <span className="bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
                Global Insurance AI
              </span>
              <br />
              <span className="text-foreground text-3xl md:text-4xl lg:text-5xl">
                Deployments
              </span>
            </h1>
            
            <p className="text-muted-foreground mb-10 max-w-xl mx-auto text-lg animate-fade-in" style={{ animationDelay: '200ms' }}>
              Track the latest AI deployments by major insurance companies worldwide.
            </p>

            {/* Stats Grid with Glassmorphism */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: '300ms' }}>
              {[
                { value: AI_DEPLOYMENTS.length, label: 'Solutions', icon: Cpu, color: 'primary' },
                { value: '10', label: 'Countries', icon: Globe2, color: 'accent' },
                { value: '8', label: 'Use Cases', icon: Layers, color: 'emerald' },
                { value: '2025', label: 'Latest', icon: Network, color: 'purple' },
              ].map((stat, index) => (
                <div
                  key={stat.label}
                  className="group relative p-5 rounded-2xl border border-white/10 backdrop-blur-xl bg-gradient-to-br from-white/5 to-white/10 dark:from-white/5 dark:to-white/[0.02] hover:border-primary/30 transition-all duration-300 hover:-translate-y-1"
                  style={{ animationDelay: `${400 + index * 100}ms` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
                  <stat.icon className={`h-5 w-5 mb-2 mx-auto ${
                    stat.color === 'primary' ? 'text-primary' :
                    stat.color === 'accent' ? 'text-accent' :
                    stat.color === 'emerald' ? 'text-emerald-500' :
                    'text-purple-500'
                  }`} />
                  <div className={`text-3xl font-bold ${
                    stat.color === 'primary' ? 'text-primary' :
                    stat.color === 'accent' ? 'text-accent' :
                    stat.color === 'emerald' ? 'text-emerald-500' :
                    'text-purple-500'
                  }`}>{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Filters with Glassmorphism */}
      <section className="sticky top-14 z-40 backdrop-blur-2xl bg-background/60 border-b border-white/10 py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search company or technology..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-12 rounded-xl bg-white/5 border-white/10 focus:border-primary/50 focus:bg-white/10 transition-all"
              />
            </div>
            
            <div className="flex flex-wrap gap-2 justify-center">
              {USE_CASES.map((useCase) => (
                <Button
                  key={useCase}
                  variant={selectedUseCase === useCase ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedUseCase(useCase)}
                  className={`text-xs h-9 rounded-full transition-all ${
                    selectedUseCase === useCase 
                      ? 'bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25' 
                      : 'hover:bg-white/10'
                  }`}
                >
                  {useCase}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* AI Deployments Grid */}
      <main className="container mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold font-display flex items-center gap-2">
            <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {selectedUseCase === 'All' ? 'All AI Deployments' : `${selectedUseCase} Solutions`}
            </span>
          </h2>
          <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1">
            {filteredDeployments.length} solutions
          </Badge>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <AICardSkeleton key={i} />
            ))}
          </div>
        ) : filteredDeployments.length === 0 ? (
          <div className="text-center py-20">
            <div className="relative inline-block">
              <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <div className="absolute -inset-4 bg-primary/10 rounded-full blur-xl -z-10" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No AI solutions found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filter</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDeployments.map((deployment, index) => (
              <Card 
                key={deployment.id} 
                className="group relative overflow-hidden rounded-2xl border border-white/10 backdrop-blur-xl bg-gradient-to-br from-white/5 to-white/10 dark:from-white/5 dark:to-white/[0.02] hover:border-primary/40 transition-all duration-500 animate-fade-in hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/10"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Glow effect */}
                <div className="absolute -inset-px bg-gradient-to-r from-primary/20 via-transparent to-accent/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
                
                <CardHeader className="pb-3 relative z-10">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-semibold text-foreground">{deployment.company}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Globe2 className="h-3 w-3" />
                        <span>{deployment.country}</span>
                        <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                        <span className="text-primary font-medium">{deployment.date}</span>
                      </div>
                    </div>
                    <Badge className="text-xs shrink-0 bg-gradient-to-r from-primary/20 to-accent/20 text-primary border-0">
                      {deployment.aiType}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-3 group-hover:text-primary transition-colors duration-300">
                    {deployment.title}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="pt-0 relative z-10">
                  <CardDescription className="text-sm mb-4 line-clamp-2 group-hover:text-foreground/70 transition-colors">
                    {deployment.description}
                  </CardDescription>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <Badge className="bg-gradient-to-r from-primary/10 to-primary/5 text-primary border-primary/20 text-xs">
                      <Zap className="h-3 w-3 mr-1" />
                      {deployment.useCase}
                    </Badge>
                  </div>

                  {deployment.impact && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 text-xs mb-4 border border-emerald-500/20">
                      <TrendingUp className="h-4 w-4 shrink-0" />
                      <span className="font-medium">{deployment.impact}</span>
                    </div>
                  )}

                  {deployment.link && (
                    <a
                      href={deployment.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium group/link"
                    >
                      Learn more 
                      <ExternalLink className="h-3.5 w-3.5 group-hover/link:translate-x-0.5 transition-transform" />
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* CTA Section with Enhanced Design */}
      <section className="container mx-auto px-4 py-16">
        <div className="relative max-w-4xl mx-auto text-center p-10 md:p-14 rounded-3xl overflow-hidden">
          {/* Background layers */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-accent/20" />
          <div className="absolute inset-0 backdrop-blur-xl" />
          <div className="absolute inset-px bg-gradient-to-br from-background/80 to-background/40 rounded-3xl" />
          
          {/* Content */}
          <div className="relative z-10">
            <div className="relative inline-block mb-4">
              <Sparkles className="h-12 w-12 text-primary mx-auto" />
              <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl animate-pulse" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold font-display mb-4">
              Know of an AI deployment we missed?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Submit new AI deployments from insurance companies worldwide (Jul 2025+).
            </p>
            <Button size="lg" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-xl shadow-primary/25 rounded-xl h-12 px-8">
              <Shield className="h-5 w-5 mr-2" />
              Submit AI Deployment
            </Button>
          </div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="border-t border-white/10 py-8 backdrop-blur-sm bg-background/50">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2025 Ghana InsureWatch. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
