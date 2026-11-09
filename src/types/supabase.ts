
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "attendees": {
                  Row: {
                    "att_date": string,"created_at": string,"device_id": number | null,"id": number,"in_time": string,"out_time": string | null,"user_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "att_date"?: string,"created_at"?: string,"device_id"?: number | null,"id"?: number,"in_time"?: string,"out_time"?: string | null,"user_id": number
                  }
                  Update: {
                    "att_date"?: string,"created_at"?: string,"device_id"?: number | null,"id"?: number,"in_time"?: string,"out_time"?: string | null,"user_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "attendees_device_id_fkey"
      columns: ["device_id"]
isOneToOne: false
      referencedRelation: "devices"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attendees_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"devices": {
                  Row: {
                    "added_by": number | null,"created_at": string,"device_name": string,"id": number,"ip_address": string | null,"last_seen_at": string | null,"mac_address": string,"placed_on": string
                  }
                  ComputedFields: never
                  Insert: {
                    "added_by"?: number | null,"created_at"?: string,"device_name": string,"id"?: number,"ip_address"?: string | null,"last_seen_at"?: string | null,"mac_address": string,"placed_on": string
                  }
                  Update: {
                    "added_by"?: number | null,"created_at"?: string,"device_name"?: string,"id"?: number,"ip_address"?: string | null,"last_seen_at"?: string | null,"mac_address"?: string,"placed_on"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "devices_added_by_fkey"
      columns: ["added_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"enrollment_queue": {
                  Row: {
                    "created_at": string,"current_message": string | null,"device_id": number,"id": number,"status": string,"updated_at": string,"user_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"current_message"?: string | null,"device_id": number,"id"?: number,"status"?: string,"updated_at"?: string,"user_id": number
                  }
                  Update: {
                    "created_at"?: string,"current_message"?: string | null,"device_id"?: number,"id"?: number,"status"?: string,"updated_at"?: string,"user_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "enrollment_queue_device_id_fkey"
      columns: ["device_id"]
isOneToOne: false
      referencedRelation: "devices"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "enrollment_queue_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"footprints": {
                  Row: {
                    "created_at": string,"details": Json | null,"id": number,"ip": string | null,"type": string,"user_agent": string | null,"user_id": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"details"?: Json | null,"id"?: number,"ip"?: string | null,"type": string,"user_agent"?: string | null,"user_id"?: number | null
                  }
                  Update: {
                    "created_at"?: string,"details"?: Json | null,"id"?: number,"ip"?: string | null,"type"?: string,"user_agent"?: string | null,"user_id"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "footprints_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "add_device": boolean,"add_user": boolean,"added_by": number | null,"auth_user_id": string | null,"created_at": string,"email": string | null,"id": number,"name": string,"phone": string,"see_all_logs": boolean,"see_all_presence": boolean,"see_users": boolean,"status": string,"update_password": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "add_device"?: boolean,"add_user"?: boolean,"added_by"?: number | null,"auth_user_id"?: string | null,"created_at"?: string,"email"?: string | null,"id"?: number,"name": string,"phone": string,"see_all_logs"?: boolean,"see_all_presence"?: boolean,"see_users"?: boolean,"status"?: string,"update_password"?: boolean
                  }
                  Update: {
                    "add_device"?: boolean,"add_user"?: boolean,"added_by"?: number | null,"auth_user_id"?: string | null,"created_at"?: string,"email"?: string | null,"id"?: number,"name"?: string,"phone"?: string,"see_all_logs"?: boolean,"see_all_presence"?: boolean,"see_users"?: boolean,"status"?: string,"update_password"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_added_by_fkey"
      columns: ["added_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"fingerprint_templates": {
                  Row: {
                    "created_at": string,"finger_index": number,"id": number,"template_data": string,"updated_at": string,"user_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"finger_index"?: number,"id"?: number,"template_data": string,"updated_at"?: string,"user_id": number
                  }
                  Update: {
                    "created_at"?: string,"finger_index"?: number,"id"?: number,"template_data"?: string,"updated_at"?: string,"user_id"?: number
                  }
                  Relationships: [
                    {
                      foreignKeyName: "fingerprint_templates_user_id_fkey"
                      columns: ["user_id"]
                      isOneToOne: false
                      referencedRelation: "profiles"
                      referencedColumns: ["id"]
                    }
                  ]
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
