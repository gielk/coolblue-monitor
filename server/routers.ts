import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createMonitoredProduct, deleteMonitoredProduct, getMonitoredProductById, getMonitoredProducts, updateMonitoredProduct, addCheckHistory, getEmailSettings, upsertEmailSettings, getPriceHistory, createNotification, getUserNotifications, getUnreadNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, getNotificationPreferences, upsertNotificationPreferences } from "./db";
import { scrapeProductData } from "./scraper";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  products: router({
    list: protectedProcedure.query(({ ctx }) => getMonitoredProducts(ctx.user.id)),
    
    add: protectedProcedure
      .input(
        z.object({
          productUrl: z.string().url(),
          userEmail: z.string().email(),
          checkIntervalMinutes: z.number().min(15).default(60),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return createMonitoredProduct({
          userId: ctx.user.id,
          productUrl: input.productUrl,
          userEmail: input.userEmail,
          checkIntervalMinutes: input.checkIntervalMinutes,
          isActive: true,
        });
      }),
    
    update: protectedProcedure
      .input(
        z.object({
          productId: z.number(),
          productUrl: z.string().url().optional(),
          userEmail: z.string().email().optional(),
          checkIntervalMinutes: z.number().min(15).optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const product = await getMonitoredProductById(input.productId, ctx.user.id);
        if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
        
        return updateMonitoredProduct(input.productId, ctx.user.id, {
          productUrl: input.productUrl,
          userEmail: input.userEmail,
          checkIntervalMinutes: input.checkIntervalMinutes,
          isActive: input.isActive,
        });
      }),
    
    delete: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const product = await getMonitoredProductById(input.productId, ctx.user.id);
        if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
        
        return deleteMonitoredProduct(input.productId, ctx.user.id);
      }),
    
    getById: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .query(({ ctx, input }) => getMonitoredProductById(input.productId, ctx.user.id)),
    
    refreshStatus: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const product = await getMonitoredProductById(input.productId, ctx.user.id);
        if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
        
        try {
          // Scrape current product data
          const productData = await scrapeProductData(product.productUrl);
          
          // Update product with latest data
          await updateMonitoredProduct(input.productId, ctx.user.id, {
            productName: productData.name,
            productImage: productData.image,
            originalPrice: productData.originalPrice,
            tweedeKansPrice: productData.tweedeKansPrice,
            tweedeKansAvailable: productData.tweedeKansAvailable,
            lastCheckedAt: new Date(),
          });
          
          // Add check history
          await addCheckHistory({
            productId: input.productId,
            tweedeKansAvailable: productData.tweedeKansAvailable,
            originalPrice: productData.originalPrice,
            tweedeKansPrice: productData.tweedeKansPrice,
            checkStatus: "success",
          });
          
          return {
            success: true,
            data: productData,
            message: "Product status updated successfully",
          };
        } catch (error) {
          // Add failed check history
          await addCheckHistory({
            productId: input.productId,
            tweedeKansAvailable: false,
            checkStatus: "error",
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          });
          
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "Failed to refresh product status" });
        }
      }),
  }),

  priceHistory: router({
    get: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ ctx, input }) => {
        const product = await getMonitoredProductById(input.productId, ctx.user.id);
        if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
        return getPriceHistory(input.productId, 100);
      }),
  }),

  emailSettings: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return getEmailSettings(ctx.user.id);
    }),
    
    update: protectedProcedure
      .input(
        z.object({
          smtpHost: z.string().optional(),
          smtpPort: z.number().optional(),
          smtpUser: z.string().optional(),
          smtpPassword: z.string().optional(),
          fromEmail: z.string().email().optional(),
          fromName: z.string().optional(),
          useResend: z.boolean().optional(),
          resendApiKey: z.string().optional(),
          useSendGrid: z.boolean().optional(),
          sendGridApiKey: z.string().optional(),
          notificationsEnabled: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await upsertEmailSettings(ctx.user.id, input);
        return { success: true };
      }),
    
    testEmail: protectedProcedure
      .input(z.object({ testEmail: z.string().email() }))
      .mutation(async ({ ctx, input }) => {
        const settings = await getEmailSettings(ctx.user.id);
        if (!settings) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Email settings not configured" });
        }
        // TODO: Implement actual email sending
        return { success: true, message: "Test email would be sent to " + input.testEmail };
      }),
  }),

  notifications: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return getUserNotifications(ctx.user.id, input?.limit || 50);
      }),

    unread: protectedProcedure.query(async ({ ctx }) => {
      return getUnreadNotifications(ctx.user.id);
    }),

    markAsRead: protectedProcedure
      .input(z.object({ notificationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const notification = await getUserNotifications(ctx.user.id, 1);
        if (!notification.find((n) => n.id === input.notificationId)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Notification not found" });
        }
        await markNotificationAsRead(input.notificationId);
        return { success: true };
      }),

    markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
      await markAllNotificationsAsRead(ctx.user.id);
      return { success: true };
    }),

    delete: protectedProcedure
      .input(z.object({ notificationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const notification = await getUserNotifications(ctx.user.id, 1);
        if (!notification.find((n) => n.id === input.notificationId)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Notification not found" });
        }
        await deleteNotification(input.notificationId);
        return { success: true };
      }),
  }),

  notificationPreferences: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const prefs = await getNotificationPreferences(ctx.user.id);
      if (!prefs) {
        // Return default preferences if not set
        return {
          userId: ctx.user.id,
          emailNotifications: true,
          pushNotifications: true,
          inAppNotifications: true,
          tweedeKansNotifications: true,
          productUpdatesNotifications: false,
          errorNotifications: true,
        };
      }
      return prefs;
    }),

    update: protectedProcedure
      .input(
        z.object({
          emailNotifications: z.boolean().optional(),
          pushNotifications: z.boolean().optional(),
          inAppNotifications: z.boolean().optional(),
          tweedeKansNotifications: z.boolean().optional(),
          productUpdatesNotifications: z.boolean().optional(),
          errorNotifications: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await upsertNotificationPreferences(ctx.user.id, input);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
