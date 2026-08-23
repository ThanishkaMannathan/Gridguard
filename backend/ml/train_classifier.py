"""
Trains a fault-type classifier on the GridGuard fault dataset.

Model: DecisionTreeClassifier (chosen for interpretability -- protection
engineers can read the decision path, which matters for a diagnosis tool).
A StandardScaler + LogisticRegression baseline is trained alongside for
comparison and the better model (by cross-val accuracy) is persisted.

Run: python train_classifier.py
Output: fault_classifier.joblib (dict with model, scaler, feature_names, label_encoder)
"""
import os
import joblib
import numpy as np
import pandas as pd
from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import classification_report, accuracy_score

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "..", "data", "fault_dataset.csv")
MODEL_PATH = os.path.join(BASE_DIR, "fault_classifier.joblib")

FEATURES = [
    "Va_rms", "Vb_rms", "Vc_rms",
    "Ia_rms", "Ib_rms", "Ic_rms",
    "frequency_hz",
    "voltage_unbalance_pct", "current_unbalance_pct",
    "zero_seq_voltage", "zero_seq_current",
]


def load_data():
    df = pd.read_csv(DATA_PATH)
    X = df[FEATURES].values
    y = df["fault_type"].values
    return X, y, df


def train():
    X, y, df = load_data()
    le = LabelEncoder()
    y_enc = le.fit_transform(y)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_enc, test_size=0.25, random_state=42, stratify=y_enc
    )

    scaler = StandardScaler().fit(X_train)
    X_train_s = scaler.transform(X_train)
    X_test_s = scaler.transform(X_test)

    tree = DecisionTreeClassifier(max_depth=6, min_samples_leaf=3, random_state=42)
    tree.fit(X_train, y_train)
    tree_acc = accuracy_score(y_test, tree.predict(X_test))
    tree_cv = cross_val_score(tree, X, y_enc, cv=5).mean()

    logreg = LogisticRegression(max_iter=1000)
    logreg.fit(X_train_s, y_train)
    logreg_acc = accuracy_score(y_test, logreg.predict(X_test_s))
    logreg_cv = cross_val_score(logreg, scaler.transform(X), y_enc, cv=5).mean()

    print("Decision Tree  -> test acc: %.3f  cv acc: %.3f" % (tree_acc, tree_cv))
    print("Logistic Reg.  -> test acc: %.3f  cv acc: %.3f" % (logreg_acc, logreg_cv))

    if tree_cv >= logreg_cv:
        best_name, best_model, needs_scaling = "decision_tree", tree, False
        y_pred = tree.predict(X_test)
    else:
        best_name, best_model, needs_scaling = "logistic_regression", logreg, True
        y_pred = logreg.predict(X_test_s)

    print(f"\nSelected model: {best_name}")
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    bundle = {
        "model": best_model,
        "model_name": best_name,
        "needs_scaling": needs_scaling,
        "scaler": scaler,
        "label_encoder": le,
        "feature_names": FEATURES,
        "test_accuracy": float(max(tree_acc, logreg_acc)),
        "cv_accuracy": float(max(tree_cv, logreg_cv)),
    }
    joblib.dump(bundle, MODEL_PATH)
    print(f"\nSaved model bundle -> {MODEL_PATH}")


if __name__ == "__main__":
    train()
