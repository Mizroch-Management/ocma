import { OrganizationSelector } from '@/components/organization/organization-selector';

export default function Organizations() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Organizations</h1>
        <p className="text-muted-foreground mt-2">
          Manage your organizations and switch between different marketing accounts.
        </p>
      </div>
      
      <OrganizationSelector />
    </div>
  );
}