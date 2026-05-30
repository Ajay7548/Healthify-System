import { useAuth } from '@/features/auth/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Placeholder landing — replaced with the latest-report card and trend chart
// once the reports API is in place.
export function DashboardPage() {
  const { user } = useAuth();
  const firstName = user.fullName.split(' ')[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {firstName}</h1>
        <p className="text-muted-foreground">Here’s an overview of your health.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>You’re signed in</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Your latest health report will appear here.
        </CardContent>
      </Card>
    </div>
  );
}
