import wordmark from "../../assets/wordmark.webp";
import { brand } from "../../copy/common";

export function BrandLogo({ className }: { className?: string }) {
  return <img src={wordmark} alt={brand.name} className={className} draggable={false} />;
}
