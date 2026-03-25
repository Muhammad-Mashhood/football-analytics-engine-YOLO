# src/evaluate.py
import yaml, mlflow, json, os
from ultralytics import YOLO

with open('params.yaml') as f:
    params = yaml.safe_load(f)

mlflow.set_tracking_uri(params['mlflow']['tracking_uri'])
mlflow.set_experiment(params['mlflow']['experiment_name'])

os.makedirs('metrics', exist_ok=True)

model   = YOLO('models/best_overall.pt')
results = model.val(
    data='data/data.yaml',
    imgsz=params['train']['imgsz'],
    batch=8,
    split='test',
    plots=True,
    save_dir='metrics',
    verbose=True,
)

r = results.results_dict
metrics = {
    'test_mAP50':    r.get('metrics/mAP50(B)',    0),
    'test_mAP50_95': r.get('metrics/mAP50-95(B)', 0),
    'test_precision':r.get('metrics/precision(B)', 0),
    'test_recall':   r.get('metrics/recall(B)',    0),
}

with open('metrics/eval_results.json', 'w') as f:
    json.dump(metrics, f, indent=2)

with mlflow.start_run(run_name='evaluate'):
    mlflow.log_metrics(metrics)
    mlflow.log_artifact('metrics/eval_results.json')

print('Evaluation complete')
for k, v in metrics.items():
    print(f'  {k}: {v:.4f}')