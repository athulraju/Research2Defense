Here is the complete markdown document:

# Skill: Exfiltration Detection via Unusual Data Transfer

## Metadata
- **Category:** behavioural
- **Severity:** Critical
- **Source Paper:** Sleeper Agents: A Study on the Robustness of Large Language Models to Backdoor Attacks
- **Detection Type:** behavioural

## Detection Objective
This skill is designed to detect potential exfiltration of sensitive data through unusual data transfer patterns. The detection logic will identify specific sequences of events that indicate malicious activity, such as loading data from file and transferring it to an external location.

## Threat Narrative
The attack we are trying to detect involves the exfiltration of sensitive data by an attacker who has compromised a large language model. The attacker injects malicious code into the model's training data, which allows them to extract sensitive information without being detected. This type of attack is difficult to detect because it relies on subtle changes in the model's behavior that may not be immediately apparent.

The attacker's goal is to exfiltrate sensitive data from the compromised system, which can have serious consequences for the organization. The detection logic will identify specific behavioral signals that indicate this type of attack, such as loading data from file and transferring it to an external location.

## Required Log Sources
- **Log Source 1:** System logs containing information about data transfer events.
- **Log Source 2:** Application logs containing information about data loading events.

## Field Mapping

| Field Name | Log Source | Purpose |
|------------|------------|---------|
| event_type | Log Source 1 | Identify data transfer events |
| data_loaded | Log Source 2 | Identify data loading events |

## Detection Logic

### Pseudo Logic
```
IF (load_data_from_file AND transfer_data_to_external_location) WITHIN 1 hour THEN alert.
```

### Behavioral Indicators
- Loading data from file
- Transferring data to external location

### Sequence Logic
The detection logic will trigger when a sequence of events is observed, where the loading of data from file is followed by the transfer of that data to an external location within a 1-hour timeframe.

## Query Ideas

### SIEM / Log Platform
```sql
SELECT * FROM logs WHERE event_type = 'data_transfer' AND timestamp > NOW() - INTERVAL 1 HOUR;
```

### API / Application Layer
```
def detect_exfiltration(logs):
    for log in logs:
        if log['event_type'] == 'data_load' and log['timestamp'] > NOW() - INTERVAL 1 HOUR:
            # Check for transfer of data to external location
            if transfer_data_to_external_location(log):
                return True
    return False
```

## Tuning Notes
To reduce false positives, consider establishing baselines for normal data transfer patterns within the organization. This can help identify unusual activity that may indicate malicious behavior.

## Limitations
This detection logic may not catch evasion techniques where the attacker uses encryption or other methods to conceal the exfiltration of sensitive data.

## Validation Strategy
To validate this detection, test it against a dataset containing both normal and malicious activity. Verify that the detection correctly identifies malicious activity while minimizing false positives.

## References
- Source Paper: Sleeper Agents: A Study on the Robustness of Large Language Models to Backdoor Attacks
- Attack Stage: exfiltration