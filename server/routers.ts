import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { createMonitoredProduct, deleteMonitoredProduct, getMonitoredProductById, getMonitoredProducts, updateMonitoredProduct, addCheckHistory } from "./db";
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
        if (!product) throw new Error("Product not found");
        
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
        if (!product) throw new Error("Product not found");
        
        return deleteMonitoredProduct(input.productId, ctx.user.id);
      }),
    
    getById: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .query(({ ctx, input }) => getMonitoredProductById(input.productId, ctx.user.id)),
    
    refreshStatus: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const product = await getMonitoredProductById(input.productId, ctx.user.id);
        if (!product) throw new Error("Product not found");
        
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
          
          throw new Error(error instanceof Error ? error.message : "Failed to refresh product status");
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
