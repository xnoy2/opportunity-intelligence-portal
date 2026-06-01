-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'REVIEWED', 'CONTACTED', 'QUOTE_SENT', 'FOLLOW_UP', 'NEGOTIATION', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "Company" AS ENUM ('BGR', 'BWDS', 'BCF', 'MULTIPLE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'STAFF');

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "planning_ref" TEXT NOT NULL,
    "project_type" TEXT,
    "description" TEXT,
    "location" TEXT,
    "postcode" TEXT,
    "applicant_name" TEXT,
    "date_submitted" TIMESTAMP(3),
    "date_approved" TIMESTAMP(3),
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "assigned_company" "Company",
    "lead_score" INTEGER NOT NULL DEFAULT 0,
    "estimated_value" INTEGER,
    "ai_summary" TEXT,
    "suggested_action" TEXT,
    "source_url" TEXT,
    "source_region" TEXT,
    "intelligence_source" TEXT NOT NULL DEFAULT 'planning',
    "classified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_notes" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pipeline_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scrape_logs" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "leads_found" INTEGER NOT NULL DEFAULT 0,
    "leads_new" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "duration_ms" INTEGER,
    "run_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scrape_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "company" "Company" NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leads_planning_ref_key" ON "leads"("planning_ref");

-- CreateIndex
CREATE INDEX "leads_assigned_company_idx" ON "leads"("assigned_company");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "leads_lead_score_idx" ON "leads"("lead_score");

-- CreateIndex
CREATE INDEX "leads_created_at_idx" ON "leads"("created_at");

-- CreateIndex
CREATE INDEX "pipeline_notes_lead_id_idx" ON "pipeline_notes"("lead_id");

-- CreateIndex
CREATE INDEX "scrape_logs_source_idx" ON "scrape_logs"("source");

-- CreateIndex
CREATE INDEX "scrape_logs_run_at_idx" ON "scrape_logs"("run_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "pipeline_notes" ADD CONSTRAINT "pipeline_notes_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
