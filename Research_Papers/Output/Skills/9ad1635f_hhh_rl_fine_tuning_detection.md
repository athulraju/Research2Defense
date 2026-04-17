# Skill: HHH RL Fine-Tuning Detection

## Metadata
- **Category:** behavioural
- **Severity:** High
- **Source Paper:** Sleeper Agent
- **Detection Type:** behavioural

## Detection Objective
This skill is designed to detect potential HHH RL fine-tuning of large language models, which can be a sign of malicious activity. The detection logic will identify specific behavioral indicators that may indicate an attacker is attempting to inject malicious code into the model's training data.

## Threat Narrative
The threat narrative for this attack involves an attacker attempting to compromise a large language model by injecting malicious code into its training data. This can be done through various means, including backdoor attacks, which are a type of adversarial attack that injects malicious code into a model's training data. The attacker may use techniques such as HHH RL fine-tuning to make the model more vulnerable to their malicious code.

The attacker's goal is to create a "sleeper agent" - a model that appears normal but can be triggered to perform malicious actions at a later time. This makes it difficult to detect, as the model may not exhibit any obvious signs of compromise until it is activated.

## Required Log Sources
- **Model Name**: The name of the large language model being trained.
- **Data**: The data loaded into the model during training.

## Field Mapping
| Field Name | Log Source | Purpose |
|------------|------------|---------|
| Model Name  | Training Logs | Identifies the specific model being trained. |
| Data        | Training Logs | Indicates the data loaded into the model. |

## Detection Logic

### Pseudo Logic
```
IF (load_data_from_file AND plot_robustness_to_hhh_rl_fine_tuning) WITHIN 1 hour THEN alert.
```

### Behavioral Indicators
- Loading data from file
- Plotting robustness to HHH RL fine-tuning

### Sequence Logic
The detection will trigger when the following sequence of events occurs within a 1-hour window:
1. The model loads data from file.
2. The model plots robustness to HHH RL fine-tuning.

## Query Ideas

### SIEM / Log Platform
```sql
SELECT * FROM logs WHERE (event = 'load_data_from_file' AND timestamp > NOW() - 1 hour) OR (event = 'plot_robustness_to_hhh_rl_fine_tuning' AND timestamp > NOW() - 1 hour)
```

### API / Application Layer
```
def detect_hhh_rl_fine_tuning(model_name, data):
    if load_data_from_file(data) and plot_robustness_to_hhh_rl_fine_tuning(model_name):
        return True
    else:
        return False
```

## Tuning Notes
To reduce false positives, consider establishing baselines for normal model training activity. This may involve monitoring the frequency and volume of data loaded into the model during training.

## Limitations
This detection may not catch evasion techniques such as using encrypted or obfuscated code to inject malicious data into the model's training data.

## Validation Strategy
To validate this detection, test it on a controlled dataset that includes both normal and anomalous activity. This will help ensure that the detection logic is accurate and effective.

## References
- Source Paper: Sleeper Agent
- Attack Stage: execution