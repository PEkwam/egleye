export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      broker_metrics: {
        Row: {
          broker_name: string
          commission_income: number | null
          created_at: string
          general_admin_expenses: number | null
          id: string
          market_share: number | null
          operational_results: number | null
          profit_loss_after_tax: number | null
          report_quarter: number | null
          report_source: string | null
          report_year: number
          total_investments_income: number | null
          updated_at: string
        }
        Insert: {
          broker_name: string
          commission_income?: number | null
          created_at?: string
          general_admin_expenses?: number | null
          id?: string
          market_share?: number | null
          operational_results?: number | null
          profit_loss_after_tax?: number | null
          report_quarter?: number | null
          report_source?: string | null
          report_year: number
          total_investments_income?: number | null
          updated_at?: string
        }
        Update: {
          broker_name?: string
          commission_income?: number | null
          created_at?: string
          general_admin_expenses?: number | null
          id?: string
          market_share?: number | null
          operational_results?: number | null
          profit_loss_after_tax?: number | null
          report_quarter?: number | null
          report_source?: string | null
          report_year?: number
          total_investments_income?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      insurer_logos: {
        Row: {
          created_at: string
          id: string
          insurer_id: string
          is_verified: boolean
          last_checked_at: string
          logo_url: string
          source: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          insurer_id: string
          is_verified?: boolean
          last_checked_at?: string
          logo_url: string
          source: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          insurer_id?: string
          is_verified?: boolean
          last_checked_at?: string
          logo_url?: string
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurer_logos_insurer_id_fkey"
            columns: ["insurer_id"]
            isOneToOne: false
            referencedRelation: "insurers"
            referencedColumns: ["insurer_id"]
          },
        ]
      }
      insurer_metrics: {
        Row: {
          branches: number | null
          category: string
          claims_ratio: number | null
          combined_ratio: number | null
          created_at: string
          credit_life: number | null
          customer_rating: number | null
          employees: number | null
          endowment: number | null
          expense_ratio: number | null
          gross_premium: number | null
          group_policies: number | null
          id: string
          insurer_id: string
          insurer_name: string
          investment_income: number | null
          market_share: number | null
          net_premium: number | null
          products_offered: number | null
          profit_after_tax: number | null
          report_quarter: number | null
          report_source: string | null
          report_year: number
          shareholders_funds: number | null
          solvency_ratio: number | null
          term_premium: number | null
          total_assets: number | null
          total_claims_paid: number | null
          universal_life: number | null
          updated_at: string
          whole_life: number | null
          years_in_ghana: number | null
        }
        Insert: {
          branches?: number | null
          category: string
          claims_ratio?: number | null
          combined_ratio?: number | null
          created_at?: string
          credit_life?: number | null
          customer_rating?: number | null
          employees?: number | null
          endowment?: number | null
          expense_ratio?: number | null
          gross_premium?: number | null
          group_policies?: number | null
          id?: string
          insurer_id: string
          insurer_name: string
          investment_income?: number | null
          market_share?: number | null
          net_premium?: number | null
          products_offered?: number | null
          profit_after_tax?: number | null
          report_quarter?: number | null
          report_source?: string | null
          report_year: number
          shareholders_funds?: number | null
          solvency_ratio?: number | null
          term_premium?: number | null
          total_assets?: number | null
          total_claims_paid?: number | null
          universal_life?: number | null
          updated_at?: string
          whole_life?: number | null
          years_in_ghana?: number | null
        }
        Update: {
          branches?: number | null
          category?: string
          claims_ratio?: number | null
          combined_ratio?: number | null
          created_at?: string
          credit_life?: number | null
          customer_rating?: number | null
          employees?: number | null
          endowment?: number | null
          expense_ratio?: number | null
          gross_premium?: number | null
          group_policies?: number | null
          id?: string
          insurer_id?: string
          insurer_name?: string
          investment_income?: number | null
          market_share?: number | null
          net_premium?: number | null
          products_offered?: number | null
          profit_after_tax?: number | null
          report_quarter?: number | null
          report_source?: string | null
          report_year?: number
          shareholders_funds?: number | null
          solvency_ratio?: number | null
          term_premium?: number | null
          total_assets?: number | null
          total_claims_paid?: number | null
          universal_life?: number | null
          updated_at?: string
          whole_life?: number | null
          years_in_ghana?: number | null
        }
        Relationships: []
      }
      insurers: {
        Row: {
          brand_color: string
          category: string
          created_at: string
          id: string
          insurer_id: string
          is_active: boolean
          keywords: string[] | null
          last_verified_at: string | null
          license_number: string | null
          license_status: string | null
          logo_url: string | null
          name: string
          short_name: string
          updated_at: string
          website: string
        }
        Insert: {
          brand_color?: string
          category: string
          created_at?: string
          id?: string
          insurer_id: string
          is_active?: boolean
          keywords?: string[] | null
          last_verified_at?: string | null
          license_number?: string | null
          license_status?: string | null
          logo_url?: string | null
          name: string
          short_name: string
          updated_at?: string
          website: string
        }
        Update: {
          brand_color?: string
          category?: string
          created_at?: string
          id?: string
          insurer_id?: string
          is_active?: boolean
          keywords?: string[] | null
          last_verified_at?: string | null
          license_number?: string | null
          license_status?: string | null
          logo_url?: string | null
          name?: string
          short_name?: string
          updated_at?: string
          website?: string
        }
        Relationships: []
      }
      news_articles: {
        Row: {
          category: string
          content: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          published_at: string | null
          source_name: string | null
          source_url: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          published_at?: string | null
          source_name?: string | null
          source_url: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          published_at?: string | null
          source_name?: string | null
          source_url?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      nonlife_insurer_metrics: {
        Row: {
          accident_others: number | null
          accident_personal: number | null
          accident_professional_indemnity: number | null
          accident_public_liability: number | null
          accident_travel: number | null
          acquisition_cashflow: number | null
          agriculture_area: number | null
          agriculture_others: number | null
          agriculture_poultry: number | null
          agriculture_weather: number | null
          attributable_expense_ratio: number | null
          aviation: number | null
          bonds: number | null
          cash_balance: number | null
          category: string
          claims_ratio: number | null
          created_at: string
          engineering: number | null
          engineering_others: number | null
          expense_ratio: number | null
          fire_property_commercial: number | null
          fire_property_private: number | null
          id: string
          insurance_contract_assets: number | null
          insurance_contract_liabilities: number | null
          insurance_finance_income: number | null
          insurance_results: number | null
          insurance_service_results: number | null
          insurance_service_revenue: number | null
          insurer_id: string
          insurer_name: string
          investment_assets: number | null
          investment_income: number | null
          marine_cargo: number | null
          marine_hull: number | null
          market_share: number | null
          microinsurance: number | null
          motor_comprehensive: number | null
          motor_others: number | null
          motor_third_party: number | null
          motor_third_party_fire_theft: number | null
          non_attributable_expense_ratio: number | null
          non_attributable_expenses: number | null
          other_income: number | null
          ppe: number | null
          profit_after_tax: number | null
          receivables: number | null
          reinsurance_contract_assets: number | null
          reinsurance_contract_liabilities: number | null
          report_quarter: number | null
          report_source: string | null
          report_year: number
          share_insurance_service_results: number | null
          technical_results_margin: number | null
          total_assets: number | null
          total_attributable_expenses: number | null
          total_incurred_claims: number | null
          total_insurance_expenses: number | null
          total_liabilities: number | null
          updated_at: string
          workman_compensation: number | null
          years_in_ghana: number | null
        }
        Insert: {
          accident_others?: number | null
          accident_personal?: number | null
          accident_professional_indemnity?: number | null
          accident_public_liability?: number | null
          accident_travel?: number | null
          acquisition_cashflow?: number | null
          agriculture_area?: number | null
          agriculture_others?: number | null
          agriculture_poultry?: number | null
          agriculture_weather?: number | null
          attributable_expense_ratio?: number | null
          aviation?: number | null
          bonds?: number | null
          cash_balance?: number | null
          category?: string
          claims_ratio?: number | null
          created_at?: string
          engineering?: number | null
          engineering_others?: number | null
          expense_ratio?: number | null
          fire_property_commercial?: number | null
          fire_property_private?: number | null
          id?: string
          insurance_contract_assets?: number | null
          insurance_contract_liabilities?: number | null
          insurance_finance_income?: number | null
          insurance_results?: number | null
          insurance_service_results?: number | null
          insurance_service_revenue?: number | null
          insurer_id: string
          insurer_name: string
          investment_assets?: number | null
          investment_income?: number | null
          marine_cargo?: number | null
          marine_hull?: number | null
          market_share?: number | null
          microinsurance?: number | null
          motor_comprehensive?: number | null
          motor_others?: number | null
          motor_third_party?: number | null
          motor_third_party_fire_theft?: number | null
          non_attributable_expense_ratio?: number | null
          non_attributable_expenses?: number | null
          other_income?: number | null
          ppe?: number | null
          profit_after_tax?: number | null
          receivables?: number | null
          reinsurance_contract_assets?: number | null
          reinsurance_contract_liabilities?: number | null
          report_quarter?: number | null
          report_source?: string | null
          report_year: number
          share_insurance_service_results?: number | null
          technical_results_margin?: number | null
          total_assets?: number | null
          total_attributable_expenses?: number | null
          total_incurred_claims?: number | null
          total_insurance_expenses?: number | null
          total_liabilities?: number | null
          updated_at?: string
          workman_compensation?: number | null
          years_in_ghana?: number | null
        }
        Update: {
          accident_others?: number | null
          accident_personal?: number | null
          accident_professional_indemnity?: number | null
          accident_public_liability?: number | null
          accident_travel?: number | null
          acquisition_cashflow?: number | null
          agriculture_area?: number | null
          agriculture_others?: number | null
          agriculture_poultry?: number | null
          agriculture_weather?: number | null
          attributable_expense_ratio?: number | null
          aviation?: number | null
          bonds?: number | null
          cash_balance?: number | null
          category?: string
          claims_ratio?: number | null
          created_at?: string
          engineering?: number | null
          engineering_others?: number | null
          expense_ratio?: number | null
          fire_property_commercial?: number | null
          fire_property_private?: number | null
          id?: string
          insurance_contract_assets?: number | null
          insurance_contract_liabilities?: number | null
          insurance_finance_income?: number | null
          insurance_results?: number | null
          insurance_service_results?: number | null
          insurance_service_revenue?: number | null
          insurer_id?: string
          insurer_name?: string
          investment_assets?: number | null
          investment_income?: number | null
          marine_cargo?: number | null
          marine_hull?: number | null
          market_share?: number | null
          microinsurance?: number | null
          motor_comprehensive?: number | null
          motor_others?: number | null
          motor_third_party?: number | null
          motor_third_party_fire_theft?: number | null
          non_attributable_expense_ratio?: number | null
          non_attributable_expenses?: number | null
          other_income?: number | null
          ppe?: number | null
          profit_after_tax?: number | null
          receivables?: number | null
          reinsurance_contract_assets?: number | null
          reinsurance_contract_liabilities?: number | null
          report_quarter?: number | null
          report_source?: string | null
          report_year?: number
          share_insurance_service_results?: number | null
          technical_results_margin?: number | null
          total_assets?: number | null
          total_attributable_expenses?: number | null
          total_incurred_claims?: number | null
          total_insurance_expenses?: number | null
          total_liabilities?: number | null
          updated_at?: string
          workman_compensation?: number | null
          years_in_ghana?: number | null
        }
        Relationships: []
      }
      pension_fund_metrics: {
        Row: {
          active_contributors: number | null
          admin_expense_ratio: number | null
          alternative_investments: number | null
          aum: number | null
          aum_growth_rate: number | null
          aum_previous: number | null
          benchmark_return: number | null
          created_at: string
          employee_contributions: number | null
          employer_contributions: number | null
          equity_allocation: number | null
          expense_ratio: number | null
          fixed_income_allocation: number | null
          fund_id: string
          fund_manager: string | null
          fund_name: string
          fund_type: string
          id: string
          investment_expense_ratio: number | null
          investment_return: number | null
          lump_sum_payments: number | null
          market_share: number | null
          money_market_allocation: number | null
          net_asset_value: number | null
          new_contributors: number | null
          pension_payments: number | null
          rank_by_aum: number | null
          report_quarter: number | null
          report_source: string | null
          report_year: number
          total_benefits_paid: number | null
          total_contributions: number | null
          total_contributors: number | null
          trustee_name: string | null
          unit_price: number | null
          updated_at: string
          voluntary_contributions: number | null
          years_in_ghana: number | null
        }
        Insert: {
          active_contributors?: number | null
          admin_expense_ratio?: number | null
          alternative_investments?: number | null
          aum?: number | null
          aum_growth_rate?: number | null
          aum_previous?: number | null
          benchmark_return?: number | null
          created_at?: string
          employee_contributions?: number | null
          employer_contributions?: number | null
          equity_allocation?: number | null
          expense_ratio?: number | null
          fixed_income_allocation?: number | null
          fund_id: string
          fund_manager?: string | null
          fund_name: string
          fund_type?: string
          id?: string
          investment_expense_ratio?: number | null
          investment_return?: number | null
          lump_sum_payments?: number | null
          market_share?: number | null
          money_market_allocation?: number | null
          net_asset_value?: number | null
          new_contributors?: number | null
          pension_payments?: number | null
          rank_by_aum?: number | null
          report_quarter?: number | null
          report_source?: string | null
          report_year: number
          total_benefits_paid?: number | null
          total_contributions?: number | null
          total_contributors?: number | null
          trustee_name?: string | null
          unit_price?: number | null
          updated_at?: string
          voluntary_contributions?: number | null
          years_in_ghana?: number | null
        }
        Update: {
          active_contributors?: number | null
          admin_expense_ratio?: number | null
          alternative_investments?: number | null
          aum?: number | null
          aum_growth_rate?: number | null
          aum_previous?: number | null
          benchmark_return?: number | null
          created_at?: string
          employee_contributions?: number | null
          employer_contributions?: number | null
          equity_allocation?: number | null
          expense_ratio?: number | null
          fixed_income_allocation?: number | null
          fund_id?: string
          fund_manager?: string | null
          fund_name?: string
          fund_type?: string
          id?: string
          investment_expense_ratio?: number | null
          investment_return?: number | null
          lump_sum_payments?: number | null
          market_share?: number | null
          money_market_allocation?: number | null
          net_asset_value?: number | null
          new_contributors?: number | null
          pension_payments?: number | null
          rank_by_aum?: number | null
          report_quarter?: number | null
          report_source?: string | null
          report_year?: number
          total_benefits_paid?: number | null
          total_contributions?: number | null
          total_contributors?: number | null
          trustee_name?: string | null
          unit_price?: number | null
          updated_at?: string
          voluntary_contributions?: number | null
          years_in_ghana?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
