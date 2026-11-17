package servers

import (
	"testing"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

func TestIsEligibleModelPlacement(t *testing.T) {
	tests := []struct {
		name       string
		labels     map[string]string
		compliance string
		available  string
		want       bool
	}{
		{
			name:       "eligible without location",
			labels:     map[string]string{"ai-grid/enabled": "true", "ai-grid/role": "inference"},
			compliance: "Compliant", available: "True", want: true,
		},
		{
			name:       "eligible combined role",
			labels:     map[string]string{"ai-grid/enabled": "true", "ai-grid/role": "combined"},
			compliance: "Compliant", available: "True", want: true,
		},
		{
			name:       "not enabled",
			labels:     map[string]string{"ai-grid/role": "inference"},
			compliance: "Compliant", available: "True",
		},
		{
			name:       "ingress role",
			labels:     map[string]string{"ai-grid/enabled": "true", "ai-grid/role": "ingress"},
			compliance: "Compliant", available: "True",
		},
		{
			name:       "not provisioned",
			labels:     map[string]string{"ai-grid/enabled": "true", "ai-grid/role": "inference"},
			compliance: "Pending", available: "True",
		},
		{
			name:       "unavailable",
			labels:     map[string]string{"ai-grid/enabled": "true", "ai-grid/role": "inference"},
			compliance: "Compliant", available: "False",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			item := placementManagedCluster("site-a", tt.labels, tt.available)
			got := isEligibleModelPlacement(item, map[string]string{"site-a": tt.compliance})
			if got != tt.want {
				t.Fatalf("isEligibleModelPlacement() = %t, want %t", got, tt.want)
			}
		})
	}
}

func TestModelPlacementLocationIsOptional(t *testing.T) {
	without := placementManagedCluster("site-a", map[string]string{"ai-grid/enabled": "true"}, "True")
	if got := modelPlacementLocation(without); got != "" {
		t.Fatalf("modelPlacementLocation() = %q, want empty", got)
	}
	with := placementManagedCluster("site-a", map[string]string{"location": "us-east"}, "True")
	if got := modelPlacementLocation(with); got != "us-east" {
		t.Fatalf("modelPlacementLocation() = %q, want %q", got, "us-east")
	}
}

func placementManagedCluster(name string, labels map[string]string, available string) *unstructured.Unstructured {
	labelMap := make(map[string]interface{}, len(labels))
	for key, value := range labels {
		labelMap[key] = value
	}
	return &unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": "cluster.open-cluster-management.io/v1",
		"kind":       "ManagedCluster",
		"metadata": map[string]interface{}{
			"name":   name,
			"labels": labelMap,
		},
		"status": map[string]interface{}{
			"conditions": []interface{}{map[string]interface{}{
				"type":   "ManagedClusterConditionAvailable",
				"status": available,
			}},
		},
	}}
}
