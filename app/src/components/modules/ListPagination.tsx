import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "../ui/pagination";

type Props = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export default function ListPagination({ page, totalPages, onPageChange, className }: Props) {
  if (totalPages <= 1) return null;

  return (
    <Pagination className={className ?? "mt-4"}>
      <PaginationContent>
        <PaginationItem>
          <PaginationLink
            href="#"
            size="default"
            className={`gap-1 px-2.5 sm:pl-2.5 ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              if (page > 1) onPageChange(page - 1);
            }}
          >
            <ChevronLeftIcon />
            <span className="hidden sm:inline">Anterior</span>
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <span className="flex h-9 items-center px-3 text-sm text-[#64748B]">
            Página {page} de {totalPages}
          </span>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink
            href="#"
            size="default"
            className={`gap-1 px-2.5 sm:pr-2.5 ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              if (page < totalPages) onPageChange(page + 1);
            }}
          >
            <span className="hidden sm:inline">Próxima</span>
            <ChevronRightIcon />
          </PaginationLink>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
