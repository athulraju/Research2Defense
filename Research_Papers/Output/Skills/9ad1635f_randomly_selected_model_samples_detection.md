# Skill: Randomly-Selected Model Samples Detection

## Metadata
- **Category:** behavioural
- **Severity:** High
- **Source Paper:** Sleeper Agents: A Study on the Robustness of Large Language Models to Backdoor Attacks
- **Detection Type:** behavioural

## Detection Objective
This skill is designed to detect potential randomly-selected model samples of large language models, which can indicate malicious activity. The detection logic will monitor for specific sequences of events that may suggest an attacker is attempting to inject malicious code into a model's training data.

## Threat Narrative
The attack we are trying to detect involves an attacker injecting malicious code into a large language model's training data. This can be done through various means, including backdoor attacks, which insert malicious code into the model's training data. The goal of this attack is to compromise the model's integrity and allow the attacker to inject malicious output at a later time.

The threat narrative unfolds as follows:

1.  An attacker identifies a large language model that they want to compromise.
2.  They inject malicious code into the model's training data, which can be done through various means such as backdoor attacks.
3.  The compromised model is then trained on the tainted data, allowing the attacker to inject malicious output at a later time.

This attack is difficult to detect because it involves manipulating the model's training data, making it challenging to identify the malicious activity. Additionally, the attacker may use various evasion techniques to avoid detection.

## Required Log Sources
The following log sources are required for this detection:

*   **Model Training Logs:** These logs contain information about the model's training process, including any unusual patterns or anomalies.
*   **Data Loading Logs:** These logs contain information about the data being loaded into the model, which can indicate if malicious code is being injected.

## Field Mapping
| Field Name | Log Source | Purpose |
|------------|------------|---------|
| model_name  | Model Training Logs | Identifies the specific model being trained. |
| data        | Data Loading Logs | Indicates if malicious code is being injected into the model's training data. |

## Detection Logic

### Pseudo Logic
```
IF (load_data_from_file AND plot_randomly_selected_model_samples) WITHIN 1 hour THEN alert.
```

### Behavioral Indicators
The following behavioral indicators suggest this attack:

*   **Loading Data from File:** This indicates that the model is loading data from an external source, which can be a sign of malicious activity.
*   **Plotting Randomly-Selected Model Samples:** This suggests that the attacker is attempting to inject malicious code into the model's training data.

### Sequence Logic
The temporal sequence or chain of events that would trigger this detection is as follows:

1.  The model loads data from an external source (load_data_from_file).
2.  The model plots randomly-selected model samples, which suggests that the attacker is attempting to inject malicious code into the model's training data.
3.  Both events occur within a 1-hour timeframe.

## Query Ideas

### SIEM / Log Platform
```sql
SELECT * FROM logs WHERE (event = 'load_data_from_file' AND timestamp > NOW() - INTERVAL 1 HOUR) OR (event = 'plot_randomly_selected_model_samples' AND timestamp > NOW() - INTERVAL 1 HOUR)
```

### API / Application Layer
```
def detect_malicious_activity(model_name, data):
    if load_data_from_file(data) and plot_randomly_selected_model_samples(model_name):
        return True
    else:
        return False
```

## Tuning Notes
To reduce false positives, consider the following:

*   Establish baselines for normal model training activity.
*   Monitor for unusual patterns or anomalies in the model's training data.

## Limitations
This detection cannot catch evasion techniques such as:

*   Using legitimate code to inject malicious output.
*   Manipulating the model's training data to avoid detection.

## Validation Strategy
To test and validate this detection, consider the following:

*   Use a controlled environment to simulate the attack.
*   Monitor for false positives and adjust the detection logic accordingly.

## References
- Source Paper: Sleeper Agents: A Study on the Robustness of Large Language Models to Backdoor Attacks
- Attack Stage: persistence