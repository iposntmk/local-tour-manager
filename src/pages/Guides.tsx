import { Layout } from '@/components/Layout';

const Guides = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Guides</h1>
          <p className="text-muted-foreground">Manage your tour guides</p>
        </div>
        
        {/* Will implement guide list and CRUD here */}
        <div className="text-center py-12 text-muted-foreground">
          Guide management coming soon...
        </div>
      </div>
    </Layout>
  );
};

export default Guides;
