import Link from "next/link";

const LOGO_SRC = "/logo.png";

type LogoProps = {
  variant?: "nav" | "footer" | "form";
  className?: string;
  onClick?: () => void;
};

const imgClass = {
  nav: "h-12 w-auto object-contain object-left sm:h-14 lg:h-16",
  footer: "h-[70px] w-auto object-contain object-left",
  form: "mx-auto h-16 w-auto object-contain sm:h-[4.5rem]",
} as const;

export function Logo({ variant = "nav", className = "", onClick }: LogoProps) {
  const image = (
    <img src={LOGO_SRC} alt="StayWithMyPet logo" className={imgClass[variant]} />
  );

  if (variant === "form") {
    return <div className={`flex justify-center ${className}`}>{image}</div>;
  }

  return (
    <Link
      href="/"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center transition-opacity hover:opacity-90 ${className}`}
      aria-label="StayWithMyPet home"
    >
      {image}
    </Link>
  );
}
