import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';

// Rows navigate to the patient's detail. They're keyboard-operable (Enter/Space)
// so the table isn't mouse-only.
export function UsersTable({ users }) {
  const navigate = useNavigate();

  function open(userId) {
    navigate(`/admin/users/${userId}`);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-medium">Patient</th>
            <th className="px-3 py-2 font-medium">Age / Sex</th>
            <th className="px-3 py-2 font-medium">Location</th>
            <th className="px-3 py-2 font-medium">Condition</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Last report</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr
              key={user.id}
              role="button"
              tabIndex={0}
              onClick={() => open(user.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  open(user.id);
                }
              }}
              className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-muted/40"
            >
              <td className="px-3 py-3">
                <p className="flex items-center gap-2 font-medium">
                  {user.fullName}
                  {user.role === 'ADMIN' ? <Badge tone="accent">Admin</Badge> : null}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                {user.age ?? '—'}
                {user.gender ? ` · ${user.gender}` : ''}
              </td>
              <td className="px-3 py-3">
                <p>{user.city ?? '—'}</p>
                {user.state ? <p className="text-xs text-muted-foreground">{user.state}</p> : null}
              </td>
              <td className="px-3 py-3 text-muted-foreground">{user.healthCondition ?? '—'}</td>
              <td className="px-3 py-3">
                <Badge tone={user.isActive ? 'normal' : 'neutral'}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                {user.lastReportDate ? formatDate(user.lastReportDate) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
