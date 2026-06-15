# ML Thinking Triggers

Concise reasoning triggers for ML research moments. Use the trigger that matches your situation — each is a 1-2 sentence activation, not a full framework.

## When Training Fails Unexpectedly

**Scientific method trigger:** Enumerate 3-5 falsifiable hypotheses for the failure. Name the cheapest observation that discriminates between them (a log line, a shape check, a gradient stat). Test in order of information gain per cost. Don't guess-and-patch.

## When a Constraint Seems Fixed

**First principles trigger:** Is this constraint physics or convention? "Model must be under 16MB" is a rule. "We can't use attention" might be convention. Name the irreducible truths, rebuild from them. If a simpler rebuild solves it, stop.

## When Reporting Results

**Margin of safety trigger:** What's the noise floor? How many runs to prove this delta? Never claim a gain smaller than your run-to-run variance. If you can't show p<0.05, it's directional at best.

## When Choosing What to Try Next

**Expected value trigger:** Rank by (expected_improvement × probability_of_working) / cost. The technique with highest EV wins, not the one that sounds most novel. A 60% chance of +0.01 for $5 beats a 10% chance of +0.05 for $50.

## When Results Don't Match Expectations

**Inversion trigger:** Instead of asking "why didn't this work?", ask "what would have to be true for this to work?" Then check each assumption. The gap between assumptions and reality is your diagnosis.

## When Comparing Approaches

**Occam's razor trigger:** When two approaches fit the data equally well, test the one with fewer assumptions first. Count assumptions explicitly. Complexity you don't need is complexity that can break.

## When Estimating Required Runs

**Statistical power trigger:** To detect an effect size `d` with 80% power at p<0.05: need roughly `N ≈ 16 / d²` samples per group. For a 10pp lift (d=0.10): ~1600 samples. For a 30pp lift (d=0.30): ~178 samples. Don't run underpowered experiments — know your required N before starting.

## When Debugging Slow Convergence

**Leverage points trigger:** Where in the training pipeline does a small change have the largest effect? Order of typical leverage: learning rate schedule > data quality/ordering > batch size > architecture > optimizer > regularization. Check the highest-leverage point first.
