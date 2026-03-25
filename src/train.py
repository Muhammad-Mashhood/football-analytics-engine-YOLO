# src/train.py
import yaml, mlflow, os, json, shutil
from pathlib import Path
from ultralytics import YOLO

# load params
with open('params.yaml') as f:
    params = yaml.safe_load(f)

MLFLOW_URI  = params['mlflow']['tracking_uri']
EXPERIMENT  = params['mlflow']['experiment_name']

mlflow.set_tracking_uri(MLFLOW_URI)
mlflow.set_experiment(EXPERIMENT)

os.makedirs('models',  exist_ok=True)
os.makedirs('metrics', exist_ok=True)

p = params['train']

with mlflow.start_run(run_name='local-repro'):
    mlflow.log_params({
        'model':   p['model'],
        'epochs':  p['epochs'],
        'imgsz':   p['imgsz'],
        'batch':   p['batch'],
        'augment': p['augment'],
    })

    model   = YOLO(p['model'])
    results = model.train(
        data='data/data.yaml',
        epochs=p['epochs'],
        imgsz=p['imgsz'],
        batch=p['batch'],
        augment=p['augment'],
        project='runs',
        name='local-repro',
        exist_ok=True,
    )

    m = results.results_dict
    metrics = {
        'mAP50':      m.get('metrics/mAP50(B)',    0),
        'mAP50_95':   m.get('metrics/mAP50-95(B)', 0),
        'precision':  m.get('metrics/precision(B)', 0),
        'recall':     m.get('metrics/recall(B)',    0),
    }
    mlflow.log_metrics(metrics)

    # Ultralytics outputs best.pt; standardize project artifact name to best_overall.pt
    best = 'runs/local-repro/weights/best.pt'
    model_out = 'models/best_overall.pt'
    shutil.copy(best, model_out)
    mlflow.log_artifact(model_out, 'weights')

    # save metrics for DVC
    with open('metrics/train_results.json', 'w') as f:
        json.dump(metrics, f, indent=2)

    print('Training complete')
    for k, v in metrics.items():
        print(f'  {k}: {v:.4f}')