import { Layout } from '@/components/Layout';

const Companies = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Companies</h1>
          <p className="text-muted-foreground">Manage partner travel companies</p>
        </div>
        
        <div className="text-center py-12 text-muted-foreground">
          Company management coming soon...
        </div>
      </div>
    </Layout>
  );
};

export default Companies;
