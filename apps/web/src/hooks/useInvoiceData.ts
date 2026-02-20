import { useQuery } from '@tanstack/react-query';
import { invoiceService } from '../services/invoice.service';

interface InvoiceFilters {
  period: string;
  category: string;
  search: string;
}

export function useInvoiceData(workspaceId?: string, filters?: InvoiceFilters) {
  return useQuery({
    queryKey: ['invoice-data', workspaceId, filters],
    queryFn: () => invoiceService.getInvoiceData(workspaceId!, filters),
    enabled: !!workspaceId,
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: 1,
    refetchOnWindowFocus: false,
  });
}