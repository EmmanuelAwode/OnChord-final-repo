import { ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";

interface BackButtonProps {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
}

export function BackButton({ onClick, label = "Back", disabled = false }: BackButtonProps) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      disabled={disabled}
      className="mb-6 hover:bg-muted group disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
      {label}
    </Button>
  );
}
