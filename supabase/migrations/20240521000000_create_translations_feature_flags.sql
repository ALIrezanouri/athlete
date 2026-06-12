-- ============================================================
-- Translations, Feature Flags, and Country Currency Config
-- Replaces mock data in GlobalEngineContext.tsx
-- ============================================================

-- ============================================================
-- 1. Add currency config columns to countries
-- ============================================================
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS currency_decimals INTEGER NOT NULL DEFAULT 2;
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS currency_display_unit TEXT;
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS currency_unit_divisor INTEGER;
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS currency_locale TEXT NOT NULL DEFAULT 'en-US';

-- Update existing countries with full currency config
UPDATE public.countries SET
  currency_decimals = 0,
  currency_display_unit = 'تومان',
  currency_unit_divisor = 10,
  currency_locale = 'fa-IR'
WHERE id = 'IR';

UPDATE public.countries SET
  currency_decimals = 2,
  currency_locale = 'ar-AE'
WHERE id = 'AE';

UPDATE public.countries SET
  currency_decimals = 2,
  currency_locale = 'en-US'
WHERE id = 'US';

UPDATE public.countries SET
  currency_decimals = 2,
  currency_locale = 'tr-TR'
WHERE id = 'TR';

-- ============================================================
-- 2. TRANSLATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    locale TEXT NOT NULL CHECK (locale IN ('en', 'fa')),
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: one translation per locale+key pair
CREATE UNIQUE INDEX IF NOT EXISTS idx_translations_locale_key
    ON public.translations (locale, key);

-- Enable RLS
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

-- Translations are publicly readable (needed for UI rendering)
CREATE POLICY "Translations are publicly readable"
    ON public.translations FOR SELECT
    USING (true);

-- Only service role can insert/update translations (admin operation)
CREATE POLICY "Service role can manage translations"
    ON public.translations FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Service role can update translations"
    ON public.translations FOR UPDATE
    USING (true);

-- Trigger for auto-update updated_at
CREATE TRIGGER trg_translations_updated_at
    BEFORE UPDATE ON public.translations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 3. FEATURE FLAGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_key TEXT NOT NULL UNIQUE,
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    country_id TEXT REFERENCES public.countries(id),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Feature flags are publicly readable
CREATE POLICY "Feature flags are publicly readable"
    ON public.feature_flags FOR SELECT
    USING (true);

-- Only service role can manage feature flags
CREATE POLICY "Service role can manage feature flags"
    ON public.feature_flags FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Service role can update feature flags"
    ON public.feature_flags FOR UPDATE
    USING (true);

-- Trigger for auto-update updated_at
CREATE TRIGGER trg_feature_flags_updated_at
    BEFORE UPDATE ON public.feature_flags
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 4. SEED FEATURE FLAGS
-- ============================================================
INSERT INTO public.feature_flags (feature_key, is_enabled, country_id, description) VALUES
    ('wallet', true, NULL, 'Wallet and payment features'),
    ('social_feed', false, NULL, 'Social feed and community features'),
    ('premium_coaching', false, NULL, 'Premium coaching and personal trainer features')
ON CONFLICT (feature_key) DO NOTHING;

-- ============================================================
-- 5. SEED TRANSLATIONS (English)
-- ============================================================
INSERT INTO public.translations (locale, key, value) VALUES
    ('en', 'global_demo.title', 'Global Engine Demo'),
    ('en', 'global_demo.subtitle', 'Centralized i18n, multi-currency & feature flag system'),
    ('en', 'global_demo.language', 'Language'),
    ('en', 'global_demo.english', 'English'),
    ('en', 'global_demo.persian', 'فارسی'),
    ('en', 'global_demo.currency_title', 'Multi-Currency Display'),
    ('en', 'global_demo.currency_desc', 'Same value (500,000 minor units) formatted per country'),
    ('en', 'global_demo.usd_label', 'United States (USD)'),
    ('en', 'global_demo.irr_label', 'Iran (Toman)'),
    ('en', 'global_demo.feature_title', 'Feature Flags'),
    ('en', 'global_demo.feature_desc', 'Toggle features on/off — simulates per-country config'),
    ('en', 'global_demo.wallet', 'Wallet'),
    ('en', 'global_demo.wallet_desc', 'Your balance and transaction history'),
    ('en', 'global_demo.wallet_balance', 'Wallet Balance'),
    ('en', 'global_demo.wallet_disabled', 'Disabled in your country'),
    ('en', 'global_demo.dynamic_title', 'Dynamic Layout Engine'),
    ('en', 'global_demo.dynamic_desc', 'Components rendered from a JSON configuration array'),
    ('en', 'global_demo.header_card', 'Welcome Back'),
    ('en', 'global_demo.header_card_desc', 'Ready to crush your workout today?'),
    ('en', 'global_demo.stats_card', 'Workout Stats'),
    ('en', 'global_demo.stats_card_desc', 'Track your progress over time'),
    ('en', 'global_demo.toggle', 'Toggle'),
    ('en', 'global_demo.enabled', 'Enabled'),
    ('en', 'global_demo.disabled', 'Disabled'),
    ('en', 'global_demo.minor_units', 'Minor units (raw):'),
    ('en', 'login.title', 'Welcome Back'),
    ('en', 'login.subtitle', 'Sign in to continue'),
    ('en', 'login.phone_placeholder', 'Phone Number'),
    ('en', 'login.otp_placeholder', 'Verification Code'),
    ('en', 'login.button_send', 'Send Code'),
    ('en', 'login.button_verify', 'Verify'),
    ('en', 'login.button_resend', 'Resend Code'),
    ('en', 'login.select_country', 'Select Country'),
    ('en', 'login.otp_sent', 'Code sent!'),
    ('en', 'login.invalid_otp', 'Invalid code'),
    ('en', 'login.invalid_phone', 'Invalid phone number'),
    ('en', 'login.verifying', 'Verifying...'),
    ('en', 'login.sending', 'Sending...'),
    ('en', 'login.back', 'Back'),
    ('en', 'nav.home', 'Home'),
    ('en', 'nav.explore', 'Explore'),
    ('en', 'nav.bookings', 'Bookings'),
    ('en', 'nav.profile', 'Profile'),
    ('en', 'home.goodMorning', 'Good Morning'),
    ('en', 'home.goodAfternoon', 'Good Afternoon'),
    ('en', 'home.goodEvening', 'Good Evening'),
    ('en', 'home.readyToTrain', 'Ready to crush your workout today?'),
    ('en', 'home.walletBalance', 'Wallet Balance'),
    ('en', 'home.topUp', 'Top Up'),
    ('en', 'home.upcomingSession', 'Upcoming Session'),
    ('en', 'home.explore', 'Explore'),
    ('en', 'home.bookings', 'Bookings'),
    ('en', 'home.favorites', 'Favorites'),
    ('en', 'home.support', 'Support'),
    ('en', 'home.popularGyms', 'Popular Gyms'),
    ('en', 'home.viewAll', 'View All'),
    ('en', 'home.session', 'session'),
    ('en', 'explore.title', 'Explore Gyms'),
    ('en', 'explore.search', 'Search gyms...'),
    ('en', 'explore.filters', 'Filters'),
    ('en', 'explore.sort', 'Sort'),
    ('en', 'explore.sportTypes', 'Sport Types'),
    ('en', 'explore.distance', 'Distance'),
    ('en', 'explore.priceRange', 'Price Range'),
    ('en', 'explore.rating', 'Rating'),
    ('en', 'explore.amenities', 'Amenities'),
    ('en', 'explore.sortNearest', 'Nearest'),
    ('en', 'explore.sortCheapest', 'Cheapest'),
    ('en', 'explore.sortHighestRated', 'Highest Rated'),
    ('en', 'explore.sortMostPopular', 'Most Popular'),
    ('en', 'explore.open', 'Open'),
    ('en', 'explore.closed', 'Closed'),
    ('en', 'explore.perSession', 'per session'),
    ('en', 'explore.reviews', 'reviews'),
    ('en', 'explore.noResults', 'No gyms found'),
    ('en', 'explore.clearFilters', 'Clear All'),
    ('en', 'explore.applyFilters', 'Apply Filters'),
    ('en', 'explore.all', 'All'),
    ('en', 'explore.km', 'km'),
    ('en', 'explore.results', 'results'),
    ('en', 'gymDetail.back', 'Back'),
    ('en', 'gymDetail.photos', 'Photos'),
    ('en', 'gymDetail.about', 'About'),
    ('en', 'gymDetail.readMore', 'Read More'),
    ('en', 'gymDetail.readLess', 'Read Less'),
    ('en', 'gymDetail.workingHours', 'Working Hours'),
    ('en', 'gymDetail.open', 'Open Now'),
    ('en', 'gymDetail.closed', 'Closed'),
    ('en', 'gymDetail.selectDate', 'Select Date'),
    ('en', 'gymDetail.selectTime', 'Select Time'),
    ('en', 'gymDetail.available', 'Available'),
    ('en', 'gymDetail.full', 'Full'),
    ('en', 'gymDetail.selected', 'Selected'),
    ('en', 'gymDetail.trainers', 'Trainers'),
    ('en', 'gymDetail.specialty', 'Specialty'),
    ('en', 'gymDetail.amenities', 'Amenities'),
    ('en', 'gymDetail.location', 'Location'),
    ('en', 'gymDetail.getDirections', 'Get Directions'),
    ('en', 'gymDetail.contact', 'Contact'),
    ('en', 'gymDetail.phone', 'Phone'),
    ('en', 'gymDetail.instagram', 'Instagram'),
    ('en', 'gymDetail.website', 'Website'),
    ('en', 'gymDetail.reviews', 'Reviews'),
    ('en', 'gymDetail.writeReview', 'Write a Review'),
    ('en', 'gymDetail.noReviews', 'No reviews yet'),
    ('en', 'gymDetail.ratingSummary', 'Rating Summary'),
    ('en', 'gymDetail.buySession', 'Buy Session'),
    ('en', 'gymDetail.perSession', 'per session'),
    ('en', 'gymDetail.sessionsLeft', 'sessions left'),
    ('en', 'gymDetail.today', 'Today'),
    ('en', 'gymDetail.tomorrow', 'Tomorrow'),
    ('en', 'gymDetail.noSlots', 'No available slots for this date'),
    ('en', 'booking.title', 'Booking Summary'),
    ('en', 'booking.gym', 'Gym'),
    ('en', 'booking.date', 'Date'),
    ('en', 'booking.time', 'Time'),
    ('en', 'booking.price', 'Session Price'),
    ('en', 'booking.walletBalance', 'Wallet Balance'),
    ('en', 'booking.balanceAfter', 'Balance After'),
    ('en', 'booking.confirm', 'Confirm Booking'),
    ('en', 'booking.cancel', 'Cancel'),
    ('en', 'booking.success', 'Booking Confirmed!'),
    ('en', 'booking.successDesc', 'Your session has been booked successfully'),
    ('en', 'booking.viewBookings', 'View My Bookings'),
    ('en', 'booking.backToGym', 'Back to Gym'),
    ('en', 'booking.insufficientBalance', 'Insufficient Balance'),
    ('en', 'booking.insufficientDesc', 'You don''t have enough balance to book this session'),
    ('en', 'booking.topUp', 'Top Up Wallet'),
    ('en', 'booking.processing', 'Processing...'),
    ('en', 'bookings.title', 'My Bookings'),
    ('en', 'bookings.upcoming', 'Upcoming'),
    ('en', 'bookings.completed', 'Completed'),
    ('en', 'bookings.cancelled', 'Cancelled'),
    ('en', 'bookings.empty', 'No bookings yet'),
    ('en', 'bookings.emptyDesc', 'When you book a session, it will appear here'),
    ('en', 'bookings.session', 'Session'),
    ('en', 'bookings.rateReview', 'Rate & Review'),
    ('en', 'bookings.cancelBooking', 'Cancel Booking'),
    ('en', 'bookings.viewGym', 'View Gym'),
    ('en', 'bookings.reviewTitle', 'Rate Your Experience'),
    ('en', 'bookings.reviewDesc', 'How was your session at this gym?'),
    ('en', 'bookings.submitReview', 'Submit Review'),
    ('en', 'bookings.writeComment', 'Write a comment...'),
    ('en', 'bookings.cancelledLabel', 'Cancelled'),
    ('en', 'bookings.completedLabel', 'Completed'),
    ('en', 'bookings.upcomingLabel', 'Upcoming'),
    ('en', 'profile.title', 'Profile'),
    ('en', 'profile.editProfile', 'Edit Profile'),
    ('en', 'profile.wallet', 'Wallet'),
    ('en', 'profile.balance', 'Balance'),
    ('en', 'profile.transactions', 'Transactions'),
    ('en', 'profile.topUp', 'Top Up'),
    ('en', 'profile.language', 'Language'),
    ('en', 'profile.notifications', 'Notifications'),
    ('en', 'profile.favorites', 'Favorites'),
    ('en', 'profile.support', 'Support'),
    ('en', 'profile.about', 'About'),
    ('en', 'profile.logout', 'Log Out'),
    ('en', 'profile.logoutConfirm', 'Are you sure you want to log out?'),
    ('en', 'profile.sessions', 'Sessions'),
    ('en', 'profile.memberSince', 'Member since'),
    ('en', 'profile.save', 'Save'),
    ('en', 'profile.cancel', 'Cancel'),
    ('en', 'profile.editName', 'Edit Name'),
    ('en', 'profile.namePlaceholder', 'Enter your name'),
    ('en', 'profile.topUpTitle', 'Top Up Wallet'),
    ('en', 'profile.topUpAmount', 'Amount'),
    ('en', 'profile.topUpDesc', 'Select or enter an amount to add to your wallet'),
    ('en', 'profile.customAmount', 'Custom amount'),
    ('en', 'profile.recentTransactions', 'Recent Transactions'),
    ('en', 'profile.noTransactions', 'No transactions yet'),
    ('en', 'profile.deposit', 'Deposit'),
    ('en', 'profile.withdrawal', 'Withdrawal'),
    ('en', 'profile.payment', 'Payment'),
    ('en', 'onboarding.title', 'Let''s Get Started'),
    ('en', 'onboarding.subtitle', 'Tell us about yourself to personalize your experience'),
    ('en', 'onboarding.step1.title', 'Personal Info'),
    ('en', 'onboarding.step1.subtitle', 'What should we call you?'),
    ('en', 'onboarding.step1.name', 'Full Name'),
    ('en', 'onboarding.step1.namePlaceholder', 'Enter your name'),
    ('en', 'onboarding.step1.dob', 'Date of Birth'),
    ('en', 'onboarding.step1.gender', 'Gender'),
    ('en', 'onboarding.step1.male', 'Male'),
    ('en', 'onboarding.step1.female', 'Female'),
    ('en', 'onboarding.step1.other', 'Other'),
    ('en', 'onboarding.step2.title', 'Fitness Profile'),
    ('en', 'onboarding.step2.subtitle', 'Help us tailor your experience'),
    ('en', 'onboarding.step2.level', 'Fitness Level'),
    ('en', 'onboarding.step2.beginner', 'Beginner'),
    ('en', 'onboarding.step2.intermediate', 'Intermediate'),
    ('en', 'onboarding.step2.advanced', 'Advanced'),
    ('en', 'onboarding.step2.professional', 'Professional'),
    ('en', 'onboarding.step2.goals', 'What are your goals?'),
    ('en', 'onboarding.step2.weight_loss', 'Weight Loss'),
    ('en', 'onboarding.step2.muscle_gain', 'Muscle Gain'),
    ('en', 'onboarding.step2.endurance', 'Endurance'),
    ('en', 'onboarding.step2.flexibility', 'Flexibility'),
    ('en', 'onboarding.step2.general_fitness', 'General Fitness'),
    ('en', 'onboarding.step3.title', 'Choose Your Gym'),
    ('en', 'onboarding.step3.subtitle', 'Pick your home gym (optional)'),
    ('en', 'onboarding.next', 'Next'),
    ('en', 'onboarding.back', 'Back'),
    ('en', 'onboarding.complete', 'Get Started!'),
    ('en', 'onboarding.step', 'Step'),
    ('en', 'onboarding.of', 'of'),
    ('en', 'onboarding.saving', 'Saving...')
ON CONFLICT (locale, key) DO NOTHING;

-- ============================================================
-- 6. SEED TRANSLATIONS (Farsi)
-- ============================================================
INSERT INTO public.translations (locale, key, value) VALUES
    ('fa', 'global_demo.title', 'دموی موتور سراسری'),
    ('fa', 'global_demo.subtitle', 'سیستم مرکزی چندزبانه، چندارزی و پرچم ویژگی'),
    ('fa', 'global_demo.language', 'زبان'),
    ('fa', 'global_demo.english', 'English'),
    ('fa', 'global_demo.persian', 'فارسی'),
    ('fa', 'global_demo.currency_title', 'نمایش چندارزی'),
    ('fa', 'global_demo.currency_desc', 'همان مقدار (۵۰۰٬۰۰۰ واحد کوچک) قالب‌بندی شده بر اساس کشور'),
    ('fa', 'global_demo.usd_label', 'ایالات متحده (دلار)'),
    ('fa', 'global_demo.irr_label', 'ایران (تومان)'),
    ('fa', 'global_demo.feature_title', 'پرچم‌های ویژگی'),
    ('fa', 'global_demo.feature_desc', 'فعال/غیرفعال کردن ویژگی‌ها — شبیه‌سازی پیکربندی کشور'),
    ('fa', 'global_demo.wallet', 'کیف پول'),
    ('fa', 'global_demo.wallet_desc', 'موجودی و تاریخچه تراکنش‌های شما'),
    ('fa', 'global_demo.wallet_balance', 'موجودی کیف پول'),
    ('fa', 'global_demo.wallet_disabled', 'در کشور شما غیرفعال است'),
    ('fa', 'global_demo.dynamic_title', 'موتور چیدمان پویا'),
    ('fa', 'global_demo.dynamic_desc', 'کامپوننت‌ها از آرایه JSON رندر شده‌اند'),
    ('fa', 'global_demo.header_card', 'خوش آمدید'),
    ('fa', 'global_demo.header_card_desc', 'آماده‌اید امروز تمرین کنید؟'),
    ('fa', 'global_demo.stats_card', 'آمار تمرین'),
    ('fa', 'global_demo.stats_card_desc', 'پیشرفت خود را در طول زمان پیگیری کنید'),
    ('fa', 'global_demo.toggle', 'تغییر وضعیت'),
    ('fa', 'global_demo.enabled', 'فعال'),
    ('fa', 'global_demo.disabled', 'غیرفعال'),
    ('fa', 'global_demo.minor_units', 'واحدهای کوچک (خام):'),
    ('fa', 'login.title', 'خوش آمدید'),
    ('fa', 'login.subtitle', 'برای ادامه وارد شوید'),
    ('fa', 'login.phone_placeholder', 'شماره موبایل'),
    ('fa', 'login.otp_placeholder', 'کد تأیید'),
    ('fa', 'login.button_send', 'ارسال کد'),
    ('fa', 'login.button_verify', 'تأیید'),
    ('fa', 'login.button_resend', 'ارسال مجدد'),
    ('fa', 'login.select_country', 'انتخاب کشور'),
    ('fa', 'login.otp_sent', 'کد ارسال شد!'),
    ('fa', 'login.invalid_otp', 'کد نامعتبر'),
    ('fa', 'login.invalid_phone', 'شماره موبایل نامعتبر'),
    ('fa', 'login.verifying', 'در حال تأیید...'),
    ('fa', 'login.sending', 'در حال ارسال...'),
    ('fa', 'login.back', 'بازگشت'),
    ('fa', 'nav.home', 'خانه'),
    ('fa', 'nav.explore', 'جستجو'),
    ('fa', 'nav.bookings', 'رزروها'),
    ('fa', 'nav.profile', 'پروفایل'),
    ('fa', 'home.goodMorning', 'صبح بخیر'),
    ('fa', 'home.goodAfternoon', 'عصر بخیر'),
    ('fa', 'home.goodEvening', 'عصر بخیر'),
    ('fa', 'home.readyToTrain', 'آماده‌اید امروز تمرین کنید؟'),
    ('fa', 'home.walletBalance', 'موجودی کیف پول'),
    ('fa', 'home.topUp', 'شارژ'),
    ('fa', 'home.upcomingSession', 'جلسه بعدی'),
    ('fa', 'home.explore', 'جستجو'),
    ('fa', 'home.bookings', 'رزروها'),
    ('fa', 'home.favorites', 'علاقه‌مندی‌ها'),
    ('fa', 'home.support', 'پشتیبانی'),
    ('fa', 'home.popularGyms', 'باشگاه‌های محبوب'),
    ('fa', 'home.viewAll', 'مشاهده همه'),
    ('fa', 'home.session', 'جلسه'),
    ('fa', 'explore.title', 'جستجوی باشگاه'),
    ('fa', 'explore.search', 'جستجوی باشگاه...'),
    ('fa', 'explore.filters', 'فیلترها'),
    ('fa', 'explore.sort', 'مرتب‌سازی'),
    ('fa', 'explore.sportTypes', 'نوع ورزش'),
    ('fa', 'explore.distance', 'فاصله'),
    ('fa', 'explore.priceRange', 'محدوده قیمت'),
    ('fa', 'explore.rating', 'امتیاز'),
    ('fa', 'explore.amenities', 'امکانات'),
    ('fa', 'explore.sortNearest', 'نزدیک‌ترین'),
    ('fa', 'explore.sortCheapest', 'ارزان‌ترین'),
    ('fa', 'explore.sortHighestRated', 'بالاترین امتیاز'),
    ('fa', 'explore.sortMostPopular', 'محبوب‌ترین'),
    ('fa', 'explore.open', 'باز'),
    ('fa', 'explore.closed', 'بسته'),
    ('fa', 'explore.perSession', 'هر جلسه'),
    ('fa', 'explore.reviews', 'نظر'),
    ('fa', 'explore.noResults', 'باشگاهی یافت نشد'),
    ('fa', 'explore.clearFilters', 'پاک کردن همه'),
    ('fa', 'explore.applyFilters', 'اعمال فیلترها'),
    ('fa', 'explore.all', 'همه'),
    ('fa', 'explore.km', 'کیلومتر'),
    ('fa', 'explore.results', 'نتایج'),
    ('fa', 'gymDetail.back', 'بازگشت'),
    ('fa', 'gymDetail.photos', 'تصاویر'),
    ('fa', 'gymDetail.about', 'درباره باشگاه'),
    ('fa', 'gymDetail.readMore', 'بیشتر بخوانید'),
    ('fa', 'gymDetail.readLess', 'بستن'),
    ('fa', 'gymDetail.workingHours', 'ساعت کاری'),
    ('fa', 'gymDetail.open', 'باز است'),
    ('fa', 'gymDetail.closed', 'بسته'),
    ('fa', 'gymDetail.selectDate', 'انتخاب تاریخ'),
    ('fa', 'gymDetail.selectTime', 'انتخاب ساعت'),
    ('fa', 'gymDetail.available', 'آزاد'),
    ('fa', 'gymDetail.full', 'تکمیل'),
    ('fa', 'gymDetail.selected', 'انتخاب شده'),
    ('fa', 'gymDetail.trainers', 'مربی‌ها'),
    ('fa', 'gymDetail.specialty', 'تخصص'),
    ('fa', 'gymDetail.amenities', 'امکانات'),
    ('fa', 'gymDetail.location', 'موقعیت'),
    ('fa', 'gymDetail.getDirections', 'مسیریابی'),
    ('fa', 'gymDetail.contact', 'تماس'),
    ('fa', 'gymDetail.phone', 'تلفن'),
    ('fa', 'gymDetail.instagram', 'اینستاگرام'),
    ('fa', 'gymDetail.website', 'وبسایت'),
    ('fa', 'gymDetail.reviews', 'نظرات'),
    ('fa', 'gymDetail.writeReview', 'ثبت نظر'),
    ('fa', 'gymDetail.noReviews', 'هنوز نظری ثبت نشده'),
    ('fa', 'gymDetail.ratingSummary', 'خلاصه امتیازات'),
    ('fa', 'gymDetail.buySession', 'خرید جلسه'),
    ('fa', 'gymDetail.perSession', 'هر جلسه'),
    ('fa', 'gymDetail.sessionsLeft', 'جلسه باقی‌مانده'),
    ('fa', 'gymDetail.today', 'امروز'),
    ('fa', 'gymDetail.tomorrow', 'فردا'),
    ('fa', 'gymDetail.noSlots', 'ساعتی برای این تاریخ موجود نیست'),
    ('fa', 'booking.title', 'خلاصه رزرو'),
    ('fa', 'booking.gym', 'باشگاه'),
    ('fa', 'booking.date', 'تاریخ'),
    ('fa', 'booking.time', 'ساعت'),
    ('fa', 'booking.price', 'قیمت جلسه'),
    ('fa', 'booking.walletBalance', 'موجودی کیف پول'),
    ('fa', 'booking.balanceAfter', 'موجودی بعد از خرید'),
    ('fa', 'booking.confirm', 'تأیید رزرو'),
    ('fa', 'booking.cancel', 'انصراف'),
    ('fa', 'booking.success', 'رزرو تأیید شد!'),
    ('fa', 'booking.successDesc', 'جلسه شما با موفقیت رزرو شد'),
    ('fa', 'booking.viewBookings', 'مشاهده رزروها'),
    ('fa', 'booking.backToGym', 'بازگشت به باشگاه'),
    ('fa', 'booking.insufficientBalance', 'موجودی ناکافی'),
    ('fa', 'booking.insufficientDesc', 'موجودی کیف پول شما برای رزرو این جلسه کافی نیست'),
    ('fa', 'booking.topUp', 'شارژ کیف پول'),
    ('fa', 'booking.processing', 'در حال پردازش...'),
    ('fa', 'bookings.title', 'رزروهای من'),
    ('fa', 'bookings.upcoming', 'آینده'),
    ('fa', 'bookings.completed', 'تکمیل شده'),
    ('fa', 'bookings.cancelled', 'لغو شده'),
    ('fa', 'bookings.empty', 'هنوز رزروی ندارید'),
    ('fa', 'bookings.emptyDesc', 'وقتی جلسه‌ای رزرو کنید، اینجا نمایش داده می‌شود'),
    ('fa', 'bookings.session', 'جلسه'),
    ('fa', 'bookings.rateReview', 'امتیاز و نظر'),
    ('fa', 'bookings.cancelBooking', 'لغو رزرو'),
    ('fa', 'bookings.viewGym', 'مشاهده باشگاه'),
    ('fa', 'bookings.reviewTitle', 'تجربه خود را امتیاز دهید'),
    ('fa', 'bookings.reviewDesc', 'جلسه شما در این باشگاه چطور بود؟'),
    ('fa', 'bookings.submitReview', 'ثبت نظر'),
    ('fa', 'bookings.writeComment', 'نظر خود را بنویسید...'),
    ('fa', 'bookings.cancelledLabel', 'لغو شده'),
    ('fa', 'bookings.completedLabel', 'تکمیل شده'),
    ('fa', 'bookings.upcomingLabel', 'آینده'),
    ('fa', 'profile.title', 'پروفایل'),
    ('fa', 'profile.editProfile', 'ویرایش پروفایل'),
    ('fa', 'profile.wallet', 'کیف پول'),
    ('fa', 'profile.balance', 'موجودی'),
    ('fa', 'profile.transactions', 'تراکنش‌ها'),
    ('fa', 'profile.topUp', 'شارژ'),
    ('fa', 'profile.language', 'زبان'),
    ('fa', 'profile.notifications', 'اعلان‌ها'),
    ('fa', 'profile.favorites', 'علاقه‌مندی‌ها'),
    ('fa', 'profile.support', 'پشتیبانی'),
    ('fa', 'profile.about', 'درباره ما'),
    ('fa', 'profile.logout', 'خروج'),
    ('fa', 'profile.logoutConfirm', 'آیا مطمئن هستید که می‌خواهید خارج شوید؟'),
    ('fa', 'profile.sessions', 'جلسات'),
    ('fa', 'profile.memberSince', 'عضو از'),
    ('fa', 'profile.save', 'ذخیره'),
    ('fa', 'profile.cancel', 'انصراف'),
    ('fa', 'profile.editName', 'ویرایش نام'),
    ('fa', 'profile.namePlaceholder', 'نام خود را وارد کنید'),
    ('fa', 'profile.topUpTitle', 'شارژ کیف پول'),
    ('fa', 'profile.topUpAmount', 'مبلغ'),
    ('fa', 'profile.topUpDesc', 'مبلغ مورد نظر برای شارژ را انتخاب یا وارد کنید'),
    ('fa', 'profile.customAmount', 'مبلغ دلخواه'),
    ('fa', 'profile.recentTransactions', 'تراکنش‌های اخیر'),
    ('fa', 'profile.noTransactions', 'هنوز تراکنشی ندارید'),
    ('fa', 'profile.deposit', 'واریز'),
    ('fa', 'profile.withdrawal', 'برداشت'),
    ('fa', 'profile.payment', 'پرداخت'),
    ('fa', 'onboarding.title', 'شروع کنیم'),
    ('fa', 'onboarding.subtitle', 'درباره خودتان بگویید تا تجربه شما شخصی‌سازی شود'),
    ('fa', 'onboarding.step1.title', 'اطلاعات شخصی'),
    ('fa', 'onboarding.step1.subtitle', 'چطور صدا کنیم؟'),
    ('fa', 'onboarding.step1.name', 'نام کامل'),
    ('fa', 'onboarding.step1.namePlaceholder', 'نام خود را وارد کنید'),
    ('fa', 'onboarding.step1.dob', 'تاریخ تولد'),
    ('fa', 'onboarding.step1.gender', 'جنسیت'),
    ('fa', 'onboarding.step1.male', 'مرد'),
    ('fa', 'onboarding.step1.female', 'زن'),
    ('fa', 'onboarding.step1.other', 'سایر'),
    ('fa', 'onboarding.step2.title', 'پروفایل ورزشی'),
    ('fa', 'onboarding.step2.subtitle', 'به ما کمک کنید تجربه شما را تنظیم کنیم'),
    ('fa', 'onboarding.step2.level', 'سطح ورزشی'),
    ('fa', 'onboarding.step2.beginner', 'مبتدی'),
    ('fa', 'onboarding.step2.intermediate', 'متوسط'),
    ('fa', 'onboarding.step2.advanced', 'پیشرفته'),
    ('fa', 'onboarding.step2.professional', 'حرفه‌ای'),
    ('fa', 'onboarding.step2.goals', 'هدف‌های شما چیست؟'),
    ('fa', 'onboarding.step2.weight_loss', 'کاهش وزن'),
    ('fa', 'onboarding.step2.muscle_gain', 'عضله‌سازی'),
    ('fa', 'onboarding.step2.endurance', 'استقامت'),
    ('fa', 'onboarding.step2.flexibility', 'انعطاف‌پذیری'),
    ('fa', 'onboarding.step2.general_fitness', 'تناسب عمومی'),
    ('fa', 'onboarding.step3.title', 'باشگاه خود را انتخاب کنید'),
    ('fa', 'onboarding.step3.subtitle', 'انتخاب باشگاه (اختیاری)'),
    ('fa', 'onboarding.next', 'بعدی'),
    ('fa', 'onboarding.back', 'قبلی'),
    ('fa', 'onboarding.complete', 'شروع!'),
    ('fa', 'onboarding.step', 'مرحله'),
    ('fa', 'onboarding.of', 'از'),
    ('fa', 'onboarding.saving', 'در حال ذخیره...')
ON CONFLICT (locale, key) DO NOTHING;