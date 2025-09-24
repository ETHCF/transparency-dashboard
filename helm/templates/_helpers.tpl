{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "alchemySecretName" -}}
{{- if .Values.global.alchemy.existingSecret -}}
{{- .Values.global.alchemy.existingSecret -}}
{{- else -}}
{{- printf "%s-alchemy-api-key" (include "fullname" .) -}}
{{- end -}}
{{- end -}}


{{- define "postgresHost" -}}
{{- if $.Values.postgresql.enabled -}}
{{- printf "%s-postgresql-hl" .Release.Name -}}
{{- else -}}
{{- $.Values.externalPostgresql.host -}}
{{- end -}}
{{- end -}}

{{- define "postgresPort" -}}
{{- if .Values.postgresql.enabled -}}
{{- 5432 -}}
{{- else -}}
{{- .Values.externalPostgresql.port -}}
{{- end -}}
{{- end -}}

{{- define "postgresDatabase" -}}
{{- if .Values.postgresql.enabled -}}

{{- if .Values.postgresql.auth.database -}}
{{- .Values.postgresql.auth.database -}}
{{- else -}}
{{- "postgres" -}}
{{- end -}}

{{- else -}}
{{- .Values.externalPostgresql.database -}}
{{- end -}}

{{- end -}}


{{- define "postgresPasswordSecret" -}}
{{- if .Values.postgresql.enabled -}}

{{- if .Values.postgresql.auth.existingSecret -}}
{{- .Values.postgresql.auth.existingSecret -}}
{{- else -}}
{{- printf "%s-postgresql" .Release.Name -}}
{{- end -}}

{{- else -}}
{{- if .Values.externalPostgresql.existingSecret -}}
{{- .Values.externalPostgresql.existingSecret -}}
{{- else -}}
{{- printf "%s-external-postgresql" (include "fullname" .) -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "postgresPasswordKey" -}}
{{- if .Values.postgresql.enabled -}}

{{- if and .Values.postgresql.auth.existingSecret .Values.postgresql.auth.secretKeys.userPasswordKey -}}
{{- .Values.postgresql.auth.secretKeys.userPasswordKey -}}
{{- else -}}
postgres-password
{{- end -}}

{{- else -}}
{{- .Values.externalPostgresql.secretKeys.passwordKey -}}
{{- end -}}
{{- end -}}


{{- define "apiServiceName" -}}
{{- printf "%s-api" (include "fullname" .) -}}
{{- end -}}
