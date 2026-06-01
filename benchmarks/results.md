# Bake-Off 2.0 Results (heuristic-only)

Items: 28

## Confusion matrix (slop = positive)

| | Predicted slop | Predicted human |
|---|---|---|
| Actual slop | 9 | 6 |
| Actual human | 0 | 13 |

- Accuracy: 78.6%
- Precision: 100.0%
- Recall: 60.0%
- F1: 75.0%

## Per signal type

### commit_generic
- TP=5 TN=5 FP=0 FN=0

### doc_concreteness
- TP=1 TN=4 FP=0 FN=3

### hollow_review
- TP=3 TN=2 FP=0 FN=0

### pr_density
- TP=0 TN=2 FP=0 FN=3
