import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import AdminIndexPage from '@/app/admin/page';
import { getAuthorDashboardSummary } from '@/lib/services/authorDashboardService';

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('next/navigation', () => ({ redirect: jest.fn() }));
jest.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }));
jest.mock('@/lib/services/authorDashboardService', () => ({
  getAuthorDashboardSummary: jest.fn(),
}));
jest.mock('@/components/admin/dashboard/AuthorDashboard', () => () => null);

const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockedRedirect = redirect as jest.MockedFunction<typeof redirect>;
const mockedGetSummary = getAuthorDashboardSummary as jest.MockedFunction<
  typeof getAuthorDashboardSummary
>;

describe('AdminIndexPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRedirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });
  });

  it('redirects a non-administrator before reading dashboard data', async () => {
    mockedGetServerSession.mockResolvedValue({ user: { role: 'viewer' } } as never);

    await expect(AdminIndexPage()).rejects.toThrow('NEXT_REDIRECT');

    expect(mockedRedirect).toHaveBeenCalledWith('/login?callbackUrl=%2Fadmin');
    expect(mockedGetSummary).not.toHaveBeenCalled();
  });

  it('reads the dashboard for an administrator', async () => {
    mockedGetServerSession.mockResolvedValue({ user: { role: 'admin' } } as never);
    mockedGetSummary.mockResolvedValue({
      generatedAt: 1,
      cards: { status: 'unavailable' },
      media: { status: 'unavailable' },
      operations: { status: 'unavailable' },
      collections: { status: 'unavailable' },
      storyWork: { status: 'unavailable' },
    });

    await AdminIndexPage();

    expect(mockedRedirect).not.toHaveBeenCalled();
    expect(mockedGetSummary).toHaveBeenCalledTimes(1);
  });
});
