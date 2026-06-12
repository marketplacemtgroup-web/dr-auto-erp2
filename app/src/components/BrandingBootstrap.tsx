import { useEffect } from "react";
import { api } from "../lib/api";
import { useBrandingStore } from "../stores/brandingStore";

export default function BrandingBootstrap() {
  const apply = useBrandingStore((s) => s.apply);

  useEffect(() => {
    void api
      .publicBranding()
      .then(apply)
      .catch(() => {
        /* mantém logo padrão do deploy */
      });
  }, [apply]);

  return null;
}
