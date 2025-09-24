import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Loader } from "@/components/common/Loader";
import { FormField } from "@/components/forms/FormField";
import { Input } from "@/components/forms/Input";
import { TextArea } from "@/components/forms/TextArea";
import { Page, PageSection } from "@/components/layout/Page";
import { useGrantMilestonesQuery, useUpdateGrantMilestonesMutation } from "@/services/grants";
import { useUiStore } from "@/stores/ui";
import type { GrantMilestone } from "@/types/domain";

const cloneMilestones = (milestones: GrantMilestone[]): GrantMilestone[] =>
  milestones.map((milestone) => ({ ...milestone }));

const MilestoneManagerPage = () => {
  const { grantId } = Route.useParams();
  const milestonesQuery = useGrantMilestonesQuery(grantId);
  const updateMutation = useUpdateGrantMilestonesMutation(grantId);
  const addToast = useUiStore((state) => state.addToast);
  const [drafts, setDrafts] = useState<GrantMilestone[]>([]);

  useEffect(() => {
    if (milestonesQuery.data) {
      setDrafts(cloneMilestones(milestonesQuery.data));
    }
  }, [milestonesQuery.data]);

  const handleChange = <K extends keyof GrantMilestone>(
    id: string,
    key: K,
    value: GrantMilestone[K],
  ) => {
    setDrafts((prev) =>
      prev.map((milestone) =>
        milestone.id === id ? { ...milestone, [key]: value } : milestone,
      ),
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await updateMutation.mutateAsync({
      milestones: drafts.map((milestone) => ({
        id: milestone.id,
        name: milestone.name,
        description: milestone.description ?? "",
        grantAmount: milestone.grantAmount.toString(),
        completed: milestone.completed,
        signedOff: milestone.signedOff,
      })),
    });

    addToast({ title: "Milestones updated", variant: "success" });
  };

  if (milestonesQuery.isPending) {
    return <Loader label="Loading milestones" />;
  }

  if (milestonesQuery.isError) {
    return (
      <ErrorState
        title="Unable to load milestones"
        description={milestonesQuery.error?.message}
      />
    );
  }

  if ((milestonesQuery.data?.length ?? 0) === 0) {
    return (
      <Page>
        <PageSection
          title="Manage Milestones"
          description="No milestones defined for this grant."
        >
          <EmptyState title="No milestones" />
          <Link to={`/admin/grants/${grantId}`} className="btn btnGhost">
            Back to grant
          </Link>
        </PageSection>
      </Page>
    );
  }

  return (
    <Page>
      <PageSection
        title="Manage Milestones"
        description="Update milestone details and statuses."
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {drafts.map((milestone) => (
              <div
                key={milestone.id}
                style={{
                  border: "1px solid rgba(92, 108, 255, 0.2)",
                  borderRadius: "var(--radius-md)",
                  padding: "1rem",
                  display: "grid",
                  gap: "0.75rem",
                }}
              >
                <FormField label="Milestone name">
                  <Input
                    value={milestone.name}
                    onChange={(event) =>
                      handleChange(milestone.id, "name", event.target.value)
                    }
                  />
                </FormField>
                <FormField label="Description">
                  <TextArea
                    value={milestone.description ?? ""}
                    onChange={(event) =>
                      handleChange(milestone.id, "description", event.target.value)
                    }
                  />
                </FormField>
                <FormField label="Grant amount (ETH)">
                  <Input
                    type="number"
                    step="0.01"
                    value={milestone.grantAmount}
                    onChange={(event) =>
                      handleChange(
                        milestone.id,
                        "grantAmount",
                        Number.parseFloat(event.target.value || "0"),
                      )
                    }
                  />
                </FormField>
                <div style={{ display: "flex", gap: "1.5rem" }}>
                  <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={milestone.completed}
                      onChange={(event) =>
                        handleChange(milestone.id, "completed", event.target.checked)
                      }
                    />
                    Completed
                  </label>
                  <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={milestone.signedOff}
                      onChange={(event) =>
                        handleChange(milestone.id, "signedOff", event.target.checked)
                      }
                    />
                    Signed off
                  </label>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem" }}>
            <button
              type="submit"
              className="btn btnPrimary"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving…" : "Save milestones"}
            </button>
            <Link to={`/admin/grants/${grantId}`} className="btn btnGhost">
              Back to grant
            </Link>
          </div>
        </form>
      </PageSection>
    </Page>
  );
};

export const Route = createFileRoute("/admin/grants/$grantId/milestones")({
  component: MilestoneManagerPage,
});
