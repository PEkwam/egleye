CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: broker_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.broker_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    broker_name text NOT NULL,
    commission_income numeric,
    general_admin_expenses numeric,
    operational_results numeric,
    total_investments_income numeric,
    profit_loss_after_tax numeric,
    market_share numeric,
    report_year integer NOT NULL,
    report_quarter integer,
    report_source text DEFAULT 'NIC Quarterly Report'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: insurer_logos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.insurer_logos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    insurer_id text NOT NULL,
    logo_url text NOT NULL,
    source text NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    last_checked_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: insurer_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.insurer_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    insurer_id text NOT NULL,
    insurer_name text NOT NULL,
    category text NOT NULL,
    gross_premium numeric(15,2),
    net_premium numeric(15,2),
    total_assets numeric(15,2),
    total_claims_paid numeric(15,2),
    shareholders_funds numeric(15,2),
    market_share numeric(5,2),
    claims_ratio numeric(5,2),
    expense_ratio numeric(5,2),
    combined_ratio numeric(5,2),
    solvency_ratio numeric(5,2),
    customer_rating numeric(3,1),
    branches integer DEFAULT 0,
    products_offered integer DEFAULT 0,
    employees integer DEFAULT 0,
    years_in_ghana integer DEFAULT 0,
    report_year integer NOT NULL,
    report_source text DEFAULT 'NIC Annual Report'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    report_quarter integer,
    group_policies numeric,
    term_premium numeric,
    credit_life numeric,
    whole_life numeric,
    endowment numeric,
    universal_life numeric,
    investment_income numeric,
    profit_after_tax numeric,
    CONSTRAINT insurer_metrics_category_check CHECK ((category = ANY (ARRAY['life'::text, 'motor'::text, 'pension'::text])))
);


--
-- Name: insurers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.insurers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    insurer_id text NOT NULL,
    name text NOT NULL,
    short_name text NOT NULL,
    category text NOT NULL,
    keywords text[] DEFAULT '{}'::text[],
    website text NOT NULL,
    logo_url text,
    brand_color text DEFAULT '#1976D2'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    license_number text,
    license_status text DEFAULT 'active'::text,
    last_verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT insurers_category_check CHECK ((category = ANY (ARRAY['life'::text, 'motor'::text, 'pension'::text])))
);


--
-- Name: news_articles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.news_articles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    content text,
    source_url text NOT NULL,
    source_name text,
    image_url text,
    category text DEFAULT 'general'::text NOT NULL,
    is_featured boolean DEFAULT false,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT news_articles_category_check CHECK ((category = ANY (ARRAY['general'::text, 'enterprise_group'::text, 'regulator'::text, 'claims'::text, 'life_insurance'::text, 'motor'::text, 'pensions'::text])))
);


--
-- Name: nonlife_insurer_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nonlife_insurer_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    insurer_id text NOT NULL,
    insurer_name text NOT NULL,
    category text DEFAULT 'nonlife'::text NOT NULL,
    report_year integer NOT NULL,
    report_quarter integer,
    fire_property_private numeric,
    fire_property_commercial numeric,
    motor_comprehensive numeric,
    motor_third_party numeric,
    motor_third_party_fire_theft numeric,
    motor_others numeric,
    accident_public_liability numeric,
    accident_professional_indemnity numeric,
    accident_travel numeric,
    workman_compensation numeric,
    accident_personal numeric,
    accident_others numeric,
    engineering numeric,
    engineering_others numeric,
    bonds numeric,
    marine_cargo numeric,
    marine_hull numeric,
    aviation numeric,
    agriculture_weather numeric,
    agriculture_area numeric,
    agriculture_poultry numeric,
    agriculture_others numeric,
    microinsurance numeric,
    insurance_service_revenue numeric,
    total_insurance_expenses numeric,
    insurance_results numeric,
    total_incurred_claims numeric,
    non_attributable_expenses numeric,
    acquisition_cashflow numeric,
    total_attributable_expenses numeric,
    insurance_service_results numeric,
    investment_income numeric,
    insurance_finance_income numeric,
    other_income numeric,
    profit_after_tax numeric,
    cash_balance numeric,
    insurance_contract_assets numeric,
    reinsurance_contract_assets numeric,
    investment_assets numeric,
    receivables numeric,
    ppe numeric,
    total_assets numeric,
    total_liabilities numeric,
    insurance_contract_liabilities numeric,
    reinsurance_contract_liabilities numeric,
    technical_results_margin numeric,
    claims_ratio numeric,
    expense_ratio numeric,
    attributable_expense_ratio numeric,
    non_attributable_expense_ratio numeric,
    market_share numeric,
    share_insurance_service_results numeric,
    report_source text DEFAULT 'NIC Quarterly Report'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pension_fund_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pension_fund_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    fund_name text NOT NULL,
    fund_id text NOT NULL,
    fund_type text DEFAULT 'tier2'::text NOT NULL,
    trustee_name text,
    fund_manager text,
    aum numeric,
    aum_previous numeric,
    aum_growth_rate numeric,
    total_contributors integer,
    active_contributors integer,
    new_contributors integer,
    total_contributions numeric,
    employer_contributions numeric,
    employee_contributions numeric,
    voluntary_contributions numeric,
    investment_return numeric,
    benchmark_return numeric,
    net_asset_value numeric,
    unit_price numeric,
    equity_allocation numeric,
    fixed_income_allocation numeric,
    money_market_allocation numeric,
    alternative_investments numeric,
    total_benefits_paid numeric,
    lump_sum_payments numeric,
    pension_payments numeric,
    expense_ratio numeric,
    admin_expense_ratio numeric,
    investment_expense_ratio numeric,
    market_share numeric,
    rank_by_aum integer,
    report_year integer NOT NULL,
    report_quarter integer,
    report_source text DEFAULT 'NPRA Quarterly Report'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: broker_metrics broker_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broker_metrics
    ADD CONSTRAINT broker_metrics_pkey PRIMARY KEY (id);


--
-- Name: insurer_logos insurer_logos_insurer_id_source_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insurer_logos
    ADD CONSTRAINT insurer_logos_insurer_id_source_key UNIQUE (insurer_id, source);


--
-- Name: insurer_logos insurer_logos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insurer_logos
    ADD CONSTRAINT insurer_logos_pkey PRIMARY KEY (id);


--
-- Name: insurer_metrics insurer_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insurer_metrics
    ADD CONSTRAINT insurer_metrics_pkey PRIMARY KEY (id);


--
-- Name: insurer_metrics insurer_metrics_unique_record; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insurer_metrics
    ADD CONSTRAINT insurer_metrics_unique_record UNIQUE (insurer_id, report_year, report_quarter);


--
-- Name: insurers insurers_insurer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insurers
    ADD CONSTRAINT insurers_insurer_id_key UNIQUE (insurer_id);


--
-- Name: insurers insurers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insurers
    ADD CONSTRAINT insurers_pkey PRIMARY KEY (id);


--
-- Name: news_articles news_articles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.news_articles
    ADD CONSTRAINT news_articles_pkey PRIMARY KEY (id);


--
-- Name: news_articles news_articles_source_url_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.news_articles
    ADD CONSTRAINT news_articles_source_url_key UNIQUE (source_url);


--
-- Name: nonlife_insurer_metrics nonlife_insurer_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nonlife_insurer_metrics
    ADD CONSTRAINT nonlife_insurer_metrics_pkey PRIMARY KEY (id);


--
-- Name: pension_fund_metrics pension_fund_metrics_fund_year_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pension_fund_metrics
    ADD CONSTRAINT pension_fund_metrics_fund_year_unique UNIQUE (fund_id, report_year);


--
-- Name: pension_fund_metrics pension_fund_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pension_fund_metrics
    ADD CONSTRAINT pension_fund_metrics_pkey PRIMARY KEY (id);


--
-- Name: nonlife_insurer_metrics unique_nonlife_insurer_quarter; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nonlife_insurer_metrics
    ADD CONSTRAINT unique_nonlife_insurer_quarter UNIQUE (insurer_id, report_year, report_quarter);


--
-- Name: broker_metrics_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX broker_metrics_unique_idx ON public.broker_metrics USING btree (broker_name, report_year, report_quarter);


--
-- Name: idx_insurer_metrics_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insurer_metrics_category ON public.insurer_metrics USING btree (category);


--
-- Name: idx_insurer_metrics_insurer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insurer_metrics_insurer ON public.insurer_metrics USING btree (insurer_id);


--
-- Name: idx_insurer_metrics_quarter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insurer_metrics_quarter ON public.insurer_metrics USING btree (report_year, report_quarter);


--
-- Name: idx_insurer_metrics_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insurer_metrics_year ON public.insurer_metrics USING btree (report_year);


--
-- Name: idx_insurers_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insurers_category ON public.insurers USING btree (category);


--
-- Name: idx_insurers_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insurers_is_active ON public.insurers USING btree (is_active);


--
-- Name: idx_insurers_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insurers_name ON public.insurers USING btree (name);


--
-- Name: idx_news_articles_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_news_articles_category ON public.news_articles USING btree (category);


--
-- Name: idx_news_articles_is_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_news_articles_is_featured ON public.news_articles USING btree (is_featured);


--
-- Name: idx_news_articles_published_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_news_articles_published_at ON public.news_articles USING btree (published_at DESC);


--
-- Name: idx_nonlife_metrics_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nonlife_metrics_category ON public.nonlife_insurer_metrics USING btree (category);


--
-- Name: idx_nonlife_metrics_insurer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nonlife_metrics_insurer ON public.nonlife_insurer_metrics USING btree (insurer_id);


--
-- Name: idx_nonlife_metrics_year_quarter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nonlife_metrics_year_quarter ON public.nonlife_insurer_metrics USING btree (report_year, report_quarter);


--
-- Name: idx_pension_fund_metrics_fund_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pension_fund_metrics_fund_id ON public.pension_fund_metrics USING btree (fund_id);


--
-- Name: idx_pension_fund_metrics_fund_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pension_fund_metrics_fund_type ON public.pension_fund_metrics USING btree (fund_type);


--
-- Name: idx_pension_fund_metrics_year_quarter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pension_fund_metrics_year_quarter ON public.pension_fund_metrics USING btree (report_year, report_quarter);


--
-- Name: broker_metrics update_broker_metrics_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_broker_metrics_updated_at BEFORE UPDATE ON public.broker_metrics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: insurer_logos update_insurer_logos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_insurer_logos_updated_at BEFORE UPDATE ON public.insurer_logos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: insurer_metrics update_insurer_metrics_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_insurer_metrics_updated_at BEFORE UPDATE ON public.insurer_metrics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: insurers update_insurers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_insurers_updated_at BEFORE UPDATE ON public.insurers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: news_articles update_news_articles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_news_articles_updated_at BEFORE UPDATE ON public.news_articles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: nonlife_insurer_metrics update_nonlife_insurer_metrics_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_nonlife_insurer_metrics_updated_at BEFORE UPDATE ON public.nonlife_insurer_metrics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pension_fund_metrics update_pension_fund_metrics_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_pension_fund_metrics_updated_at BEFORE UPDATE ON public.pension_fund_metrics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: insurer_logos insurer_logos_insurer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insurer_logos
    ADD CONSTRAINT insurer_logos_insurer_id_fkey FOREIGN KEY (insurer_id) REFERENCES public.insurers(insurer_id) ON DELETE CASCADE;


--
-- Name: broker_metrics Anyone can view broker metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view broker metrics" ON public.broker_metrics FOR SELECT USING (true);


--
-- Name: insurer_metrics Anyone can view insurer metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view insurer metrics" ON public.insurer_metrics FOR SELECT USING (true);


--
-- Name: news_articles Anyone can view news articles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view news articles" ON public.news_articles FOR SELECT USING (true);


--
-- Name: nonlife_insurer_metrics Anyone can view nonlife insurer metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view nonlife insurer metrics" ON public.nonlife_insurer_metrics FOR SELECT USING (true);


--
-- Name: pension_fund_metrics Anyone can view pension fund metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view pension fund metrics" ON public.pension_fund_metrics FOR SELECT USING (true);


--
-- Name: insurer_logos Insurer logos are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Insurer logos are publicly readable" ON public.insurer_logos FOR SELECT USING (true);


--
-- Name: insurers Insurers are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Insurers are publicly readable" ON public.insurers FOR SELECT USING (true);


--
-- Name: news_articles Service role can manage articles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage articles" ON public.news_articles USING (true) WITH CHECK (true);


--
-- Name: broker_metrics Service role can manage broker metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage broker metrics" ON public.broker_metrics USING (true) WITH CHECK (true);


--
-- Name: insurer_metrics Service role can manage metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage metrics" ON public.insurer_metrics USING (true) WITH CHECK (true);


--
-- Name: nonlife_insurer_metrics Service role can manage nonlife metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage nonlife metrics" ON public.nonlife_insurer_metrics USING (true) WITH CHECK (true);


--
-- Name: pension_fund_metrics Service role can manage pension metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage pension metrics" ON public.pension_fund_metrics USING (true) WITH CHECK (true);


--
-- Name: broker_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.broker_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: insurer_logos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.insurer_logos ENABLE ROW LEVEL SECURITY;

--
-- Name: insurer_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.insurer_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: insurers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.insurers ENABLE ROW LEVEL SECURITY;

--
-- Name: news_articles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;

--
-- Name: nonlife_insurer_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nonlife_insurer_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: pension_fund_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pension_fund_metrics ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;