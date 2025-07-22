-- Create app_settings table for centralized configuration
CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT, -- Will store encrypted values
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create index on setting_key for faster lookups
CREATE INDEX idx_app_settings_key ON public.app_settings(setting_key);

-- Add RLS policies
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Only super admins can read app settings
-- For now, we'll create a function to check if user is a super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- For now, we'll check if user owns any workspace
    -- In production, you'd want a proper admin table
    RETURN EXISTS (
        SELECT 1 FROM public.workspaces 
        WHERE owner_id = user_id
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policy for reading app settings (super admins only)
CREATE POLICY "Super admins can read app settings" ON public.app_settings
    FOR SELECT
    USING (public.is_super_admin(auth.uid()));

-- RLS policy for updating app settings (super admins only)
CREATE POLICY "Super admins can update app settings" ON public.app_settings
    FOR UPDATE
    USING (public.is_super_admin(auth.uid()));

-- RLS policy for inserting app settings (super admins only)
CREATE POLICY "Super admins can insert app settings" ON public.app_settings
    FOR INSERT
    WITH CHECK (public.is_super_admin(auth.uid()));

-- RLS policy for deleting app settings (super admins only)
CREATE POLICY "Super admins can delete app settings" ON public.app_settings
    FOR DELETE
    USING (public.is_super_admin(auth.uid()));

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_app_settings_updated_at
    BEFORE UPDATE ON public.app_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default API settings (encrypted values will be set via application)
INSERT INTO public.app_settings (setting_key, setting_value) VALUES
    ('openai_api_key', NULL),
    ('anthropic_api_key', NULL),
    ('default_api_provider', 'openai')
ON CONFLICT (setting_key) DO NOTHING;

-- Add comment
COMMENT ON TABLE public.app_settings IS 'Stores application-wide settings including API keys';
COMMENT ON COLUMN public.app_settings.setting_value IS 'Encrypted value for sensitive settings';