import { useNavigate } from 'react-router-dom';
import { MapPin, Users, Building2, Globe, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: MapPin,
      title: 'Tour Management',
      description: 'Create and manage tours with destinations, expenses, and meals',
      action: () => navigate('/tours'),
      color: 'text-primary'
    },
    {
      icon: Users,
      title: 'Guides',
      description: 'Manage your tour guides database',
      action: () => navigate('/guides'),
      color: 'text-accent'
    },
    {
      icon: Building2,
      title: 'Companies',
      description: 'Keep track of partner travel companies',
      action: () => navigate('/companies'),
      color: 'text-info'
    },
    {
      icon: Globe,
      title: 'Nationalities',
      description: 'Manage client nationality information',
      action: () => navigate('/nationalities'),
      color: 'text-success'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container mx-auto px-4 py-12 sm:py-16">
        {/* Hero Section */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-4">
            <MapPin className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground">
            Tour Manager
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Cloud-based tour management system for organizing tours, guides, and companies
          </p>
          <div className="flex flex-wrap gap-3 justify-center mt-8">
            <Button size="lg" onClick={() => navigate('/tours')} className="gap-2">
              Get Started <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary/50"
              onClick={feature.action}
            >
              <CardHeader>
                <feature.icon className={`h-10 w-10 mb-2 ${feature.color}`} />
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" size="sm" className="w-full gap-2">
                  Open <ArrowRight className="h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Section */}
        <Card className="max-w-3xl mx-auto bg-gradient-to-br from-primary/5 to-accent/5 border-2">
          <CardHeader>
            <CardTitle>About This App</CardTitle>
            <CardDescription>
              This is a cloud-based tour management application built with React, TypeScript, and Supabase.
              All your data is stored securely in the cloud for access anywhere, anytime.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>✓ Cloud-based storage with Supabase backend</p>
            <p>✓ Export/Import data as JSON for backup and sharing</p>
            <p>✓ Responsive design works on desktop and mobile</p>
            <p>✓ Fast typeahead search for all master data</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
