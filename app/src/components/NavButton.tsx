import { useNavigate } from "react-router";

interface NavButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  to: string;
  children: React.ReactNode;
}

/** Botão que navega — evita `<button>` sem ação no protótipo Kimi */
export default function NavButton({
  to,
  children,
  className,
  type = "button",
  ...props
}: NavButtonProps) {
  const navigate = useNavigate();

  return (
    <button
      type={type}
      className={className}
      onClick={(e) => {
        props.onClick?.(e);
        if (!e.defaultPrevented) navigate(to);
      }}
      {...props}
    >
      {children}
    </button>
  );
}
