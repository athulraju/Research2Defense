# Skill: Backdoor Training Detection

## Metadata
- **Category:** behavioural
- **Severity:** High
- **Source Paper:** Sleeper Agents: A Study on the Robustness of Large Language Models to Backdoor Attacks
- **Detection Type:** behavioural

## Detection Objective
This skill is designed to detect potential backdoor training of large language models. The detection logic is based on identifying specific behavioral indicators that may indicate malicious activity, such as loading data from file and plotting rate of vulnerability explanation.

## Threat Narrative
Backdoor attacks are a type of adversarial attack that injects malicious code into a model's training data. This can compromise the security and integrity of the model, allowing attackers to manipulate its behavior and potentially leading to unauthorized access or data breaches. The attacker may use various techniques to evade detection, such as using legitimate-looking data or modifying the model's architecture.

## Required Log Sources
- **Model Training Logs**: These logs contain information about the model training process, including data loading and processing.
- **System Logs**: These logs provide system-level information, such as user activity and file access.

## Field Mapping

| Field Name | Log Source | Purpose |
|------------|------------|---------|
| model_name  | Model Training Logs | Identifies the specific model being trained. |
| data        | Model Training Logs | Contains information about the data loaded during training. |

## Detection Logic

### Pseudo Logic
```
IF (load_data_from_file AND plot_rate_of_vulnerability_explanation) WITHIN 1 hour THEN alert.
```

### Behavioral Indicators
- Loading data from file
- Plotting rate of vulnerability explanation

### Sequence Logic
The detection logic is triggered when the following sequence of events occurs within a 1-hour window:
1. The model training logs show loading of data from file.
2. The system logs show plotting of rate of vulnerability explanation.

## Query Ideas

### SIEM / Log Platform
```sql
SELECT * FROM log WHERE (event = 'load_data_from_file' AND timestamp > NOW() - 1 hour) OR (event = 'plot_rate_of_vulnerability_explanation' AND timestamp > NOW() - 1 hour)
```

### API / Application Layer
```
def detect_backdoor_training(model_logs, system_logs):
    if ('load_data_from_file' in model_logs and 'plot_rate_of_vulnerability_explanation' in model_logs) or \
       ('load_data_from_file' in system_logs and 'plot_rate_of_vulnerability_explanation' in system_logs):
        return True
    else:
        return False
```

## Tuning Notes
To reduce false positives, consider establishing baselines for normal model training activity. This may involve analyzing logs from previous model training sessions to identify typical patterns.

## Limitations
This detection logic may not catch evasion techniques, such as using legitimate-looking data or modifying the model's architecture. Additionally, it relies on the presence of specific behavioral indicators in the logs, which may not always be present.

## Validation Strategy
To validate this detection skill, test it against a dataset containing both normal and malicious model training activity. Verify that the detection logic correctly identifies backdoor training attempts while minimizing false positives.

## References
- Source Paper: Sleeper Agents: A Study on the Robustness of Large Language Models to Backdoor Attacks
- Attack Stage: initial_access