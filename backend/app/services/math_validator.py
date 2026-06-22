import re
from typing import List, Dict, Any

class MathValidator:
    """
    Pre-computes metrics and validates quantitative claims in the Master Profile
    before they are passed to the LLM for phrasing.
    """
    
    def extract_and_compute(self, text: str) -> Dict[str, Any]:
        metrics = {}
        
        # 1. Team growth matching (e.g. "grew team from X to Y")
        growth_match = re.search(r"grew team from (\d+) to (\d+)", text, re.IGNORECASE)
        if growth_match:
            start, end = int(growth_match.group(1)), int(growth_match.group(2))
            percent_growth = ((end - start) / start) * 100 if start != 0 else 0.0
            metrics["team_growth"] = {
                "start": start,
                "end": end,
                "percent": f"{percent_growth:.1f}%",
                "absolute": end - start
            }
            
        # 2. Revenue / monetary claims (e.g., "$10M", "$500K", "$100,000")
        monetary = []
        for match in re.finditer(r"\$\d+(?:,\d{3})*(?:\.\d+)?\s*[kKmMbB]?", text):
            monetary.append(match.group(0))
        if monetary:
            metrics["monetary"] = list(sorted(set(monetary)))
            
        # 3. Percentages (e.g., "45%", "2.5%")
        percentages = []
        for match in re.finditer(r"\b(\d+(?:\.\d+)?)\s*%\b", text):
            pct_val = match.group(0)
            start_idx = max(0, match.start() - 30)
            end_idx = min(len(text), match.end() + 30)
            snippet = text[start_idx:end_idx].strip()
            percentages.append({
                "value": pct_val,
                "context": f"...{snippet}..."
            })
        if percentages:
            metrics["percentages"] = percentages
            
        # 4. Large quantities or milestones (e.g., "50k+", "10,000+", "100m+")
        milestones = []
        for match in re.finditer(r"\b\d+(?:,\d{3})*(?:\.\d+)?\s*[kKmMbB]\+?\b", text):
            token = match.group(0)
            if not token.startswith('$'): # Avoid duplicate with monetary
                milestones.append(token)
        if milestones:
            metrics["milestones"] = list(sorted(set(milestones)))
            
        return metrics

    def generate_ground_truth(self, metrics: Dict[str, Any]) -> str:
        """
        Creates a 'locked' ground truth string to be injected into the LLM prompt.
        """
        lines = ["GROUND TRUTH METRICS (DO NOT ALTER NUMBERS):"]
        if "team_growth" in metrics:
            val = metrics["team_growth"]
            lines.append(f"- Team size increased from {val['start']} to {val['end']} ({val['percent']} growth).")
        if "monetary" in metrics:
            for mon in metrics["monetary"]:
                lines.append(f"- Verified monetary claim: {mon}.")
        if "percentages" in metrics:
            for pct in metrics["percentages"]:
                lines.append(f"- Verified percentage claim: {pct['value']} in context of '{pct['context']}'.")
        if "milestones" in metrics:
            for mile in metrics["milestones"]:
                lines.append(f"- Verified numeric milestone: {mile}.")
        return "\n".join(lines)

math_validator = MathValidator()
