import re
from typing import List, Dict, Any

class MathValidator:
    """
    Pre-computes metrics and validates quantitative claims in the Master Profile
    before they are passed to the LLM for phrasing.
    """
    
    def extract_and_compute(self, text: str) -> Dict[str, Any]:
        metrics = {}
        
        # Example pattern: "grew team from X to Y"
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
            
        # Example: Revenue metrics
        rev_match = re.search(r"\$(\d+(?:\.\d+)?)\s*(M|K|B)", text, re.IGNORECASE)
        if rev_match:
            value = float(rev_match.group(1))
            multiplier = rev_match.group(2).upper()
            metrics["revenue"] = {
                "value": value,
                "magnitude": multiplier,
                "canonical": f"${value}{multiplier}"
            }
            
        return metrics

    def generate_ground_truth(self, metrics: Dict[str, Any]) -> str:
        """
        Creates a 'locked' ground truth string to be injected into the LLM prompt.
        """
        lines = ["GROUND TRUTH METRICS (DO NOT ALTER NUMBERS):"]
        for key, val in metrics.items():
            if key == "team_growth":
                lines.append(f"- Team size increased from {val['start']} to {val['end']} ({val['percent']} growth).")
            elif key == "revenue":
                lines.append(f"- Revenue impact: {val['canonical']}.")
        return "\n".join(lines)

math_validator = MathValidator()
